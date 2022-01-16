import { TcpServerClient } from './TcpServerClient'
import MsgType from '../common/MsgType'
import Store from './Store'
import { createServer } from 'net'

export default class ProxyServer {
	
	constructor(private port: number, private store: Store) {}
	
	start(): void {
		const self = this
		const server = createServer(function(socket){
			self.onProxyClientConnect(new TcpServerClient(socket, true))
		})
		server.on('error', () => {})
		server.on('close', function() {
			self.start()
		})
		server.listen(this.port, '0.0.0.0', function() {
			console.log('代理服务端启动完成，监听端口:' + self.port)
			self.store.changeConfigure()
		})
	}
	
	onProxyClientConnect(client: TcpServerClient) {
		const self = this

		const timeout = setTimeout(() => client.close(), this.store.system.timeout * 1000)
		let configureId = 0
		
		client.onReceive(function(msg) {
			switch (msg.type as MsgType){
				case MsgType.auth: {
					const cfg = self.store.configure.whereOne({ key: msg.data as string })
					if (!cfg) {
						client.close()
						return
					}
					clearTimeout(timeout)
					client.write(MsgType.auth)
					if (self.store.proxyClientMap[cfg.id]){
						return
					}
					configureId = cfg.id
					self.store.proxyClientMap[cfg.id] = client
					return
				}
				case MsgType.connect: {
					const userClient = self.store.userClientMap[msg.data as string]
					if (!userClient) {
						client.close()
						return
					}
					userClient.next = client
					client.next = userClient
					for (const item of userClient.queue){
						client.write(MsgType.transfer, item.toString('base64'))
					}
					userClient.queue = []
					return
				}
				case MsgType.transfer: {
					let data = Buffer.from(msg.data, 'base64')
					if (client.next){
						client.next.write(data)
					}
					return
				}
				case MsgType.disconnect: {
					const userClient = self.store.userClientMap[msg.data as string]
					if (userClient){
						userClient.close()
					}
				}
			}
		
		}).onClose(function(){
			if (client.next){
				client.next.write(Buffer.alloc(0))
				client.next.close()
			}
			if (configureId > 0){
				delete self.store.proxyClientMap[configureId]
			}
			configureId = 0
		})
	}
}