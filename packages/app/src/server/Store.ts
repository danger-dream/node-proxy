import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import JSONStore from '../common/JSONStore'
import { IBlack, IConfigure, ISystem } from '../../types'
import { TcpServerClient } from './TcpServerClient'
import UserProxyServer from './UserProxyServer'
import { Server } from 'net'
import Metrics from './Metrics'
import { init, ip2region } from '../common/ip2region'

const storePath = join(process.argv.includes('--local') ? process.cwd() : process.env.HOME || process.cwd(), '.node-proxy')
const systemPath = join(storePath, '.sys')

export default class Store {
	configure = JSONStore.create<IConfigure>('configure', storePath)
	black = JSONStore.create<IBlack>('black', storePath)
	system: ISystem = { enable: true, overseas: false, timeout: 30 }
	
	userProxyServer = new UserProxyServer(this)
	
	metrics = new Metrics(storePath, this)
	
	proxyServerMap = {} as Record<number, Server>

	proxyClientMap = {} as Record<number, TcpServerClient>

	userClientMap = {} as Record<string, TcpServerClient>
	
	constructor() {
		try {
			Object.assign(this.system, JSON.parse(readFileSync(systemPath).toString()))
		}catch {}
		if (this.system.enable === undefined){
			this.system.enable = true
		}
		if (this.system.overseas === undefined){
			this.system.overseas = false
		}
		if (this.system.timeout === undefined){
			this.system.timeout = 30
		}
		init().then((r) => {
			if (r){
				console.log('初始化地址库成功')
			}else {
				console.log('初始化地址库失败，无法拦截国外用户')
			}
		})
	}
	
	getIpRegionCode(ip: string): string {
		if (!ip) return ''
		const res = ip2region(ip)
		return res ? res.code : ''
	}
	
	getIpRegionAddress(ip: string): string {
		if (!ip) return ''
		const res = ip2region(ip)
		return res ? res.address : ''
	}
	
	setSystem(sys: ISystem) {
		Object.assign(this.system, sys)
		try {
			writeFileSync(systemPath, JSON.stringify(this.system))
		}catch {}
	}
	
	private handleConfigure: boolean = false

	changeConfigure(){
		if (this.handleConfigure) return
		this.handleConfigure = true
		const list = this.configure.query()
		const listenProxyPorts = [] as number[]
		for (const item of list){
			for (const proxy of item.proxyMappings){
				let proxyServer = this.proxyServerMap[proxy.inetPort]
				if (proxy.enable){
					listenProxyPorts.push(proxy.inetPort)
					if (proxyServer) continue
					//  启动且未运行的代理服务端
					this.userProxyServer.createUserServer(proxy, item)
				}else {
					//  关闭代理中被禁用的代理服务端
					proxyServer && proxyServer.close()
				}
			}
		}
		//  关闭配置中不存在或被禁用的代理服务端
		for (const port of Object.keys(this.proxyServerMap).map(x => parseInt(x))){
			if (listenProxyPorts.includes(port)) continue
			let proxyServer = this.proxyServerMap[port]
			if (!proxyServer) continue
			proxyServer.close()
		}
		//  关闭配置中不存在的代理客户端
		for (const item of Object.keys(this.proxyClientMap).map(x => parseInt(x))){
			if (!list.find(x => x.id === item)){
				this.proxyClientMap[item]!.close()
			}
		}
		this.handleConfigure = false
	}
}