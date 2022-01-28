import { createServer } from 'net'
import { IConfigure, IProxyMapping } from '../../types'
import { TcpServerClient } from './TcpServerClient'
import MsgType from '../common/MsgType'
import Store from './Store'

export default class UserProxyServer {
	
	private clientMap = {} as Record<string, TcpServerClient>
	
	constructor(private store: Store) {}
	
	createUserServer(proxy: IProxyMapping, configure: IConfigure): void {
		const self = this
		const server = createServer(function(socket){
			if (!self.store.system.enable){
				socket.destroy()
				return
			}
			const client = new TcpServerClient(socket, false)
			self.store.connect.bindClient(client, proxy)
			client.onClose(function(){
				delete self.clientMap[client.id]
			})
			self.clientMap[client.id] = client
			self.onUserConnect(proxy, configure, client)
		})
		server.on('error', () => {})
		server.on('close', function() {
			delete self.store.proxyServerMap[proxy.inetPort]
		})
		server.listen(proxy.inetPort, '0.0.0.0', function() {
			self.store.proxyServerMap[proxy.inetPort] = server
		})
	}

	onUserConnect(proxy: IProxyMapping, configure: IConfigure, client: TcpServerClient) {
		const self = this
		//  如果地址在黑名单中则关闭
		if (this.store.black.whereOne({ ip: client.socket.remoteAddress })){
			client.close()
			return
		}
		//  不允许国外用户连接时
		if (!this.store.system.overseas){
			//  获取用户地址所在国家编码，获取成功并且不是CN的，关闭连接
			const region = this.store.getIpRegionCode(client.socket.remoteAddress!)
			if (region && region !== 'CN'){
				client.close()
				return
			}
		}
		
		const proxyClient = this.store.proxyClientMap[configure.id]
		if (!proxyClient || !this.store.system.enable){
			client.close()
			return
		}
		client.onData(function(buf){
			if (client.next){
				client.next.write(MsgType.transfer, buf.toString('base64'))
			}else {
				client.queue.push(buf)
			}
		}).onClose(function(){
			if (client.next){
				client.next.write(MsgType.disconnect)
				client.next.close()
			}
			delete self.store.userClientMap[client.id]
		})
		this.store.userClientMap[client.id] = client
		proxyClient.write(MsgType.connect, { lan: proxy.lan, id: client.id })
	}
	
	closeClient(id: string): boolean{
		try {
			if (this.clientMap[id]){
				this.clientMap[id]!.close()
				return true
			}
		}catch {}
		return false
	}
}