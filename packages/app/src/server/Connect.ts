import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { TcpServerClient } from './TcpServerClient'
import { IProxyMapping } from '../../types'
import Store from './Store'

interface IConnect {
	id: string
	remoteIp: string
	remotePort: number
	localPort: number
	up: number
	down: number
	timestamp: number
	endTime: number
	region: string
	status: boolean
}

export default class Connect {
	
	private conns = [] as IConnect[]
	private connMap = {} as Record<string, IConnect>
	private readonly storePath:string
	private removeIdList = [] as string[]
	
	constructor(storePath: string, private store: Store) {
		this.storePath = join(storePath, 'connect')
		this.loadConnect()
		const self = this
		setInterval(function (){
			if (self.removeIdList.length < 1) return
			for (const id of self.removeIdList){
				const conn = self.connMap[id]
				if (!conn) continue
				delete self.connMap[id]
				self.conns.splice(0, 0, conn)
			}
			self.removeIdList = []
			self.saveConnect()
		}, 1000 * 60)
	}
	
	loadConnect(){
		if (!existsSync(this.storePath)){
			return
		}
		try {
			this.conns = JSON.parse(readFileSync(this.storePath).toString())
			for (const item of this.conns)
				item.status = false
		} catch {}
	}
	
	saveConnect(){
		writeFileSync(this.storePath, JSON.stringify(this.conns))
	}
	
	bindClient(client: TcpServerClient, proxy: IProxyMapping) {
		const self = this
		const host = client.socket.remoteAddress!
		const port = client.socket.remotePort!
		const address = this.store.getIpRegionAddress(host)
		const conn = {
			id: client.id,
			remoteIp: host,
			remotePort: port,
			localPort: proxy.inetPort,
			up: 0, down: 0, timestamp: Date.now(), endTime: 0,
			region: address, status: true
		} as IConnect
		this.connMap[client.id] = conn
		client.on('read', function(n: number) {
			conn.up += n
		}).on('write', function(n: number) {
			conn.down += n
		}).on('close', function() {
			conn.status = false
			conn.endTime = Date.now()
			self.removeIdList.push(client.id)
		})
	}
	
	getConnList(){
		return Object.keys(this.connMap).map(x => this.connMap[x]!).sort((a, b) => (b.down + b.up) - (a.down + a.up))
	}
	
	getAll(){
		return this.conns
	}
}