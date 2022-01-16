import { RunArgs } from '../../types'
import TcpClient from './TcpClient'
import MsgType from '../common/MsgType'
import RealClient from './RealClient'

export default function(args: RunArgs){
	if (!args.key){
		console.error('启动失败，代理认证密钥为空')
		process.send!(400)
		process.exit()
		return
	}
	if (!args.proxyServerHost){
		console.error('启动失败，代理服务端地址为空')
		process.send!(400)
		process.exit()
		return
	}
	const port = Number(args.proxyServerPort + '')
	if (!port || Number.isNaN(port)){
		console.error('启动失败，代理服务端端口为空或无效')
		process.send!(400)
		process.exit()
		return
	}
	args.proxyServerPort = port
	const client = new TcpClient(args.proxyServerHost, port, true, true)
	let auth = false
	let first = true
	let heartbeat = -1 as any
	client.onReady(() => {
		client.write(MsgType.auth, args.key)
	})
	client.onReceive(function(msg){
		if (msg.type === MsgType.auth) {
			auth = true
			first = false
			heartbeat = setInterval(function(){
				client.write(MsgType.heartbeat)
			}, 30 * 1000)
			console.log('连接代理服务端成功')
		}
		else if (msg.type === MsgType.connect){
			const { lan, id } = msg.data
			if (!lan || !id) return
			(new RealClient(lan, id, args, client)).connect()
		}
	})
	client.onClose(function(){
		clearInterval(heartbeat)
		if (!auth && first){
			console.error('连接代理服务器失败...未能通过认证')
			process.send!(401)
			process.exit()
			return
		}
		auth = false
	})
	client.connect()
}