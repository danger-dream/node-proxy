import TcpClient from './TcpClient'
import MsgType from '../common/MsgType'
import { RunArgs } from '../../types'

export default class RealClient {
	private realClient!: TcpClient
	private readonly host: string = ''
	private readonly port: number = 0
	private queue = [] as Buffer[]
	private next?: TcpClient
	
	constructor(lan: string, private id: string, private args: RunArgs, private baseClient:TcpClient) {
		const arr = lan.split(':')
		if (arr.length !== 2) {
			baseClient.write(MsgType.disconnect, id)
			return
		}
		this.host = arr[0] as string
		this.port = parseInt(arr[1] as string)
	}
	
	connect(){
		const self = this
		const realClient = this.realClient = new TcpClient(this.host, this.port, false, false)
		realClient.onReady(this.onReady.bind(this))
		realClient.onData((buf) => {
			if (!self.next){
				self.queue.push(buf)
				return
			}
			self.next.write(MsgType.transfer, buf.toString('base64'))
		})
		realClient.onClose(() => {
			self.baseClient.write(MsgType.disconnect, self.id)
			self.next && self.next.close()
		})
		realClient.connect()
	}
	
	onReady(){
		const self = this
		const proxyClient = new TcpClient(this.args.proxyServerHost, this.args.proxyServerPort, true, true)
		proxyClient.onReady(() => {
			proxyClient.write(MsgType.auth, self.args.key)
		})
		proxyClient.onClose(function(){
			try {
				self.realClient.close()
			}catch {}
		})
		proxyClient.onReceive(function(msg){
			switch (msg.type){
				case MsgType.auth: {
					self.next = proxyClient
					proxyClient.write(MsgType.connect, self.id)
					for (const buf of self.queue){
						proxyClient.write(MsgType.transfer, buf.toString('base64'))
					}
					self.queue = []
					return
				}
				case MsgType.transfer: {
					self.realClient.write(Buffer.from(msg.data, 'base64'))
					return
				}
				case MsgType.disconnect: {
					self.realClient.close()
					proxyClient.close()
				}
			}
		})
		proxyClient.connect()
	}
}