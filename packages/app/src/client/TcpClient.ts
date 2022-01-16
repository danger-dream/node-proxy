import { EventEmitter } from 'events'
import { Socket } from 'net'
import BufferHandle, { makeData } from '../common/BufferHandle'
import MsgType from '../common/MsgType'

// noinspection DuplicatedCode
export default class tcpClient extends EventEmitter {
	protected socket!: Socket
	
	constructor(
		protected host: string, protected port: number,
		private reconnect: boolean = true, protected formatMsg: boolean = false) {
		super()
	}
	
	connect(): Error | undefined {
		try {
			const self = this
			const bufferHandle = BufferHandle(this.handleNativeData.bind(this))
			this.socket = new Socket()
			this.socket.connect(this.port, this.host, () => {
				self.emit('ready')
			}).
			on('data', buf => {
				if (self.formatMsg){
					bufferHandle.putData(buf)
				}else {
					self.emit('data', buf)
				}
			}).
			on('error', () => {}).
			on('close', () => {
				self.emit('close')
				if (!self.reconnect) return
				setTimeout(() => self.connect(), 2000)
			})
			return undefined
		}catch (e){
			if (this.reconnect){
				setTimeout(this.connect.bind(this), 2000)
			}
			return e
		}
	}
	
	handleNativeData(buf: Buffer){
		if (!Buffer.isBuffer(buf)) return
		if (this.formatMsg){
			try {
				const res = JSON.parse(buf.toString('utf8'))
				if (res.data !== undefined && res.type !== undefined){
					this.emit('receive', res)
				}
			}catch {}
		}else {
			this.emit('data', buf)
		}
	}
	
	write(type: Buffer | MsgType, data?: any): void {
		try {
			if (Buffer.isBuffer(type)){
				this.socket.write(type)
			}else {
				if (!data) {
					data = Date.now()
				}
				this.socket.write(makeData(Buffer.from(JSON.stringify({ type, data }))))
			}
		}catch {}
	}
	
	close(): void {
		try {
			this.reconnect = false
			if (this.socket){
				this.socket.destroy()
			}
		}catch {}
	}
	
	onReady(fn: () => void): this {
		this.on('ready', fn)
		return this
	}
	
	onClose(fn: () => void): this {
		this.on('close', fn)
		return this
	}
	
	onReceive(fn: (msg: { type: MsgType, data: any }) => void): this {
		this.on('receive', fn)
		return this
	}
	
	onData(fn: (buf: Buffer) => void): this {
		this.on('data', fn)
		return this
	}
}