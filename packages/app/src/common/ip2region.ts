import { existsSync } from 'fs'
import { join } from 'path'
// @ts-ignore
import maxmind from 'maxmind'

export interface Region {
	code: string
	address: string
}

const mdbPath = join(process.cwd(), 'city.mmdb')

export function available(){
	return existsSync(mdbPath)
}

let lookup: any
export async function init() {
	if (!available()) return false
	lookup = await maxmind.open(mdbPath)
	return true
}

function get(obj: any): string {
	for (const k of ['zh-CN', 'ja']){
		let name = obj[k]
		if (name) return name
	}
	return ''
}

export function ip2region(ip: string): Region | undefined {
	if (!lookup) return undefined
	const res = lookup.get(ip)
	const region = { code: 'CN', address: '内网' }
	if (!res) return region
	let name = ''
	if (res.country){
		region.code = res.country.iso_code
		name = get(res.country.names)
	}else if (res.registered_country){
		region.code = res.registered_country.iso_code
		name = get(res.registered_country.names)
	}
	let address = [] as string[]
	res.subdivisions && address.push(res.subdivisions.map(x => get(x.names)).join(''))
	res.city && address.push(get(res.city.names))
	region.address = name + Array.from(new Set(address.filter(x => x))).join('')
	return region
}