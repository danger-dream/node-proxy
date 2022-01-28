import { EventEmitter } from 'events'
import { Socket } from 'net'
import { UUID } from '../common/Utils'
import BufferHandle, { makeData } from '../common/BufferHandle'
import MsgType from '../common/MsgType'
import { decrypt, encrypt } from '../common/ProxyCrypto'

export class TcpServerClient extends EventEmitter {
	public id: string = UUID()
	public next?: TcpServerClient
	public queue = [] as Buffer[]
	private closeTimeout?: any
	public communicationTime = Date.now()
	
	constructor(public socket: Socket, private formatMsg: boolean) {
		super()
		const self = this
		const handle = BufferHandle(this.onMsg.bind(this))
		
		socket.on('data', (buf) => {
			try {
				self.communicationTime = Date.now()
				self.emit('read', buf.length)
				if (self.formatMsg){
					handle.putData(buf)
				}else {
					self.emit('data', buf)
				}
			}catch {}
		})
		socket.on('error', () => {})
		socket.on('close', () => {
			if (self.closeTimeout){
				clearTimeout(self.closeTimeout)
			}
			self.emit('close')
		})
		
	}
	
	onMsg(buf: Buffer){
		try {
			const deBuf = decrypt(buf)
			if (!deBuf){
				return
			}
			let res = JSON.parse(deBuf.toString('utf8'))
			if (res.data !== undefined && res.type !== undefined){
				this.emit('receive', res)
			}
		}catch {}
	}
	
	// noinspection DuplicatedCode
	write(type: Buffer | MsgType, data?: any): void {
		try {
			if (Buffer.isBuffer(type)){
				this.emit('write', type.length)
				this.socket.write(type)
			}else {
				if (!data) {
					data = Date.now()
				}
				const temp = makeData(encrypt(JSON.stringify({ type, data })))
				this.emit('write', temp.length)
				this.socket.write(temp)
			}
			this.communicationTime = Date.now()
		}catch {}
	}
	
	close(): void {
		try {
			this.socket.write(Buffer.alloc(0))
			this.socket.end()
			const self = this
			this.closeTimeout = setTimeout(function(){
				try {
					self.socket.destroy()
				}catch {}
			}, 1000 * 10)
		}catch {}
	}
	
	onReceive(fn: (msg: { type: MsgType, data: any }) => void): this {
		this.on('receive', fn)
		return this
	}
	
	onData(fn: (buf: Buffer) => void): this {
		this.on('data', fn)
		return this
	}
	
	onClose(fn: () => void): this {
		this.on('close', fn)
		return this
	}
}