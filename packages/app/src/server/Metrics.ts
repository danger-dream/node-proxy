import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { TcpServerClient } from './TcpServerClient'
import { IProxyMapping } from '../../types'
import { deepClone } from '../common/Utils'
import Store from './Store'

interface IMetrics {
	localPort: number
	lan: string
	up: number
	down: number
	connectNum: number
}

interface IMetricsConnect {
	remoteAddr: string
	remotePort: number
	localPort: number
	lan: string
	up: number
	down: number
	timestamp: number
	status: boolean
	clientId: string
	address: string
}

interface IMetricsIP {
	remoteAddr: string
	up: number
	down: number
	connectNum: number
	address: string
}

interface IMetricsIPConnect {
	remoteAddr: string
	remotePort: number
	localPort: number
	lan: string
	up: number
	down: number
	timestamp: number
	status: boolean
	clientId: string
	address: string
}

export default class Metrics {
	
	private metricsMap = {} as Record<string, IMetrics>
	private metricsConnMap = {} as Record<string, IMetricsConnect>
	private metricsIpMap = {} as Record<string, IMetricsIP>
	private metricsIpConnMap = {} as Record<number, IMetricsIPConnect>
	private readonly metricsPath:string
	
	constructor(storePath: string, private store: Store) {
		this.metricsPath = join(storePath, 'metrics')
		this.loadMetrics()
		const self = this
		setInterval(function(){
			self.saveMetrics()
		}, 1000 * 60 * 5)
	}
	
	loadMetrics(){
		if (!existsSync(this.metricsPath)){
			return
		}
		try {
			const json = JSON.parse(readFileSync(this.metricsPath).toString())
			this.metricsMap = json.metricsMap
			this.metricsConnMap = json.metricsConnMap
			for (const k of Object.keys(this.metricsConnMap)){
				this.metricsConnMap[k]!.status = false
			}
			this.metricsIpMap = json.metricsIpMap
			this.metricsIpConnMap = json.metricsIpConnMap
			for (const k of Object.keys(this.metricsIpConnMap)){
				this.metricsIpConnMap[k]!.status = false
			}
		}
		catch {}
	}
	
	saveMetrics(){
		writeFileSync(this.metricsPath, JSON.stringify({
			metricsMap: this.metricsMap,
			metricsConnMap: this.metricsConnMap,
			metricsIpMap: this.metricsIpMap,
			metricsIpConnMap: this.metricsIpConnMap
		}))
	}
	
	bindClient(client: TcpServerClient, proxy: IProxyMapping) {
		const self = this
		const host = client.socket.remoteAddress!
		const port = client.socket.remotePort!
		const address = this.store.getIpRegionAddress(host)
		
		
		const sign_local = `${ proxy.inetPort } -> ${ proxy.lan }`
		if (!this.metricsMap[sign_local]) {
			this.metricsMap[sign_local] = {
				localPort: proxy.inetPort, up: 0, down: 0, lan: proxy.lan, connectNum: 0
			} as IMetrics
		}
		this.metricsMap[sign_local]!.connectNum++
		
		const sign = `${ host }:${ port } -> ${ sign_local }`
		if (!this.metricsConnMap[sign]){
			this.metricsConnMap[sign] = {
				remoteAddr: host!, remotePort: port!, localPort: proxy.inetPort, lan: proxy.lan, clientId: client.id ,
				up: 0, down: 0, timestamp: Date.now(), status: true, address
			} as IMetricsConnect
		}
		
		if (!this.metricsIpMap[host]) {
			this.metricsIpMap[host] = {
				remoteAddr: host, up: 0, down: 0, connectNum: 0, address
			} as IMetricsIP
		}
		this.metricsIpMap[host]!.connectNum++
		
		const sign_remote = `${ host }:${ port } -> ${ proxy.inetPort }`
		if (!this.metricsIpConnMap[sign_remote]){
			this.metricsIpConnMap[sign_remote] = {
				remoteAddr: host, remotePort: port, localPort: proxy.inetPort, lan: proxy.lan, clientId: client.id,
				up: 0, down: 0, timestamp: Date.now(), status: true, address
			} as IMetricsIPConnect
		}
		client.on('read', function(n: number) {
			self.metricsMap[sign_local]!.up += n
			self.metricsConnMap[sign]!.up += n
			self.metricsIpMap[host]!.up += n
			self.metricsIpConnMap[sign_remote]!.up += n
		}).on('write', function(n: number) {
			self.metricsMap[sign_local]!.down += n
			self.metricsConnMap[sign]!.down += n
			self.metricsIpMap[host]!.down += n
			self.metricsIpConnMap[sign_remote]!.down += n
		}).on('close', function() {
			self.metricsConnMap[sign]!.status = false
			self.metricsIpConnMap[sign_remote]!.status = false
			self.saveMetrics()
		})
	}
	
	getMetricsTree(){
		const result = [] as any[]
		const connKeys = Object.keys(this.metricsConnMap)
		for (const key of Object.keys(this.metricsMap)) {
			const m = this.metricsMap[key]
			const children = connKeys.filter(x => x.endsWith(key)).map(x => this.metricsConnMap[x]!).sort((a, b) => {
				if (a.remoteAddr === b.remoteAddr){
					return (b.down + b.up) - (a.down + a.up)
				}else {
					return b.remoteAddr.localeCompare(a.remoteAddr)
				}
			}).splice(0, 100)
			result.push(Object.assign({ children }, deepClone(m)) as any)
		}
		return result.sort((a, b) => {
			if (a.connectNum === b.connectNum){
				return (b.down + b.up) - (a.down + a.up)
			}else {
				return b.connectNum - a.connectNum
			}
		}).splice(0, 100)
	}
	
	getMetricsIdTree(){
		const result = [] as any[]
		const connKeys = Object.keys(this.metricsIpConnMap)
		for (const key of Object.keys(this.metricsIpMap)) {
			const m = this.metricsIpMap[key]!
			const children = connKeys.filter(x => x.startsWith(key)).map(x => this.metricsIpConnMap[x]).sort((a, b) => {
				if (a.localPort === b.localPort){
					return (b.down + b.up) - (a.down + a.up)
				}else {
					return b.localPort - a.localPort
				}
			}).splice(0, 100)
			result.push(Object.assign({ children }, deepClone(m)) as any)
		}
		return result.sort((a, b) => {
			if (a.connectNum === b.connectNum){
				return (b.down + b.up) - (a.down + a.up)
			}else {
				return b.connectNum - a.connectNum
			}
		}).splice(0, 100)
	}
}