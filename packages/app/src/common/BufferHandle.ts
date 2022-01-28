type messageReceiveFunction = (buf: Buffer) => void

const headerLength = 4

class BufferHandle {
	private readonly msgReceiveFn? :messageReceiveFunction
	
	private cache?: Buffer
	
	constructor(receiveFn?: messageReceiveFunction) {
		if (receiveFn)
			this.msgReceiveFn = receiveFn
	}
	
	putData(data: Buffer | string): void {
		if (!this.msgReceiveFn) return
		let curBuf = Buffer.from(data)
		while (true){
			const buf = this.cache = this.cache ? Buffer.concat([this.cache, curBuf]) : curBuf
			try {
				if (buf.length < 4) return
				let length = buf.readInt32LE()
				if (buf.length < length) {
					return
				}
				let temp = Buffer.alloc(length - headerLength)
				buf.copy(temp, 0, headerLength, length)
				this.msgReceiveFn(temp)
				this.cache = undefined
				let slength = buf.length - length
				if (slength < 1)
					return
				curBuf = Buffer.alloc(slength)
				buf.copy(curBuf, 0, length, buf.length)
			}catch (e) {
				console.log(
					'解包出错了, buf:' + buf.length +
					', start:' + (buf.length > 0 ? buf : 'empty') +
					', cache:' + this.cache!.length +
					', curBuf,' + curBuf.length
				)
				throw e
			}
		}
	}
}

export default function create(receiveFn?: messageReceiveFunction): BufferHandle {
	return new BufferHandle(receiveFn)
}

export function makeData(msg: string | Buffer) {
	const bodyBuf = Buffer.from(msg)
	const res = Buffer.alloc(headerLength + bodyBuf.length)
	res.writeInt32LE(res.length)
	bodyBuf.copy(res, headerLength, 0, bodyBuf.length)
	return res
}
