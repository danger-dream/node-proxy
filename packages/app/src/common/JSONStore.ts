import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
// @ts-ignore
import alasql from 'alasql'
import { deepClone } from './Utils'

export declare interface IRecord extends Record<string, any>{
	id?: number
}

const SAVE = Symbol('!@#SAVE)*_')
const QUERY = Symbol('$%&^*QUERY&^%$')

export default class JSONStore<R extends IRecord> {
	
	private readonly cache = [] as R[]
	private readonly path = '' as string
	
	private constructor(name: string, path?: string) {
		this.cache = []
		const rootPath = path || join(process.cwd(), 'db')
		if (!existsSync(rootPath)){
			mkdirSync(rootPath)
		}
		this.path = join(rootPath, name)
		if (existsSync(this.path)){
			try {
				const res = JSON.parse(readFileSync(this.path).toString())
				if (Array.isArray(res)){
					this.cache.push(...res)
				}
			}catch {}
		}
	}
	
	static create<R>(name: string, path?: string): JSONStore<R>{
		return new JSONStore<R>(name, path)
	}
	
	[SAVE](){
		writeFileSync(this.path, JSON.stringify(this.cache, undefined, '\t'))
	}
	
	insert(data: R){
		data.id = Number(new Date().getTime() + parseInt((Math.random() * 10000) + ''))
		this.cache.push(data)
		this[SAVE]()
		return data.id
	}
	
	update(data: R, save = true){
		if (!data.id) return 0
		const res = this.cache.filter(x => x.id === data.id)
		if (res.length < 1) return 0
		for (const item of res){
			Object.assign(item, data)
		}
		save && this[SAVE]()
		return res.length
	}
	
	remove(id: number): boolean {
		let index = this.cache.findIndex(x => x.id === id)
		if (index === -1) return false
		this.cache.splice(index, 1)
		this[SAVE]()
		return true
	}
	
	list(page = 1, size = 9999, sql?: string, cols?: string): { total: number, data: R[] } {
		let list = sql || cols ? this[QUERY](sql, cols, false) : this.cache
		const st = (page - 1) * size
		return { total: list.length, data: deepClone(list.slice(st, st + size)) }
	}
	
	[QUERY](sql?: string, cols?: string, deep = true){
		let res = this.cache
		if (sql || cols){
			res = alasql(`select ${ cols || '*' } from ? ${ sql ? ' where ' + sql : '' }`, [this.cache])
		}
		return deep ? deepClone(res) : res
	}
	
	query(sql?: string, cols?: string, deep: boolean = true): R[] {
		return this[QUERY](sql, cols, deep)
	}
	
	where(where: Record<any, string>, deep = false): R[] {
		let res = this.cache
		if (Object.keys(where || {}).length > 0){
			const keys = Object.keys(where)
			const result = [] as R[]
			for (const item of this.cache){
				let seek = false
				for (const k of keys){
					if (item[k] !== where[k]){
						seek = false
						break
					}
					seek = true
				}
				if (seek){
					result.push(item)
				}
			}
			res = result
		}
		return deep ? deepClone(res) : res
	}
	
	whereOne(where: Record<any, any>, deep = false): R | undefined {
		const res = this.where(where, deep)
		if (res.length > 0) return res[0]
		return undefined
	}
}