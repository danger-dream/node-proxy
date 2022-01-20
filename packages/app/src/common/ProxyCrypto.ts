const key = '$&cOOpldfo1EYLW1$$I*r!pOu!1ddwkvVHv$%(8f2(*^7823bc$6213d{dwecv='
const ord = [];
for (let i = 1; i <= 255; i++) {
	ord[String.fromCharCode(i)] = i
}

export function encrypt(input: string | Buffer): Buffer {
	let sk = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
	let ek = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
	const newKey = sk + key + ek
	const buf = Buffer.from(JSON.stringify({ data: Buffer.from(input).toString('base64') }))
	const res = [] as any[];
	for (let i = 0; i < buf.length; i++){
		const x = buf[i]! ^ (newKey.substr(i % newKey.length, 1) as any)
		res.push(x ^ (ord[i] as any))
	}
	return Buffer.concat([Buffer.from(sk), Buffer.from(res), Buffer.from(ek)]);
}

export function decrypt(buf: Buffer): Buffer | undefined {
	let sk = buf.subarray(0, 4).toString()
	let ek = buf.subarray(buf.length - 4).toString()
	buf = buf.subarray(4, buf.length - 4)
	const newKey = sk + key + ek
	const res = [] as any[];
	for (let i = 0; i < buf.length; i++){
		const x = buf[i]! ^ ord[i]!
		res.push(x ^ (newKey.substr(i % newKey.length, 1) as any))
	}
	try {
		return Buffer.from(JSON.parse(Buffer.from(res).toString()).data, 'base64')
	}catch {
		return undefined
	}
}


const salt = 'qwertyuiopasdfghj!@#$%^&*klzxcvbnmQWERTYUIO1234567890PASDFGHJKLZXCVBNM'
const saltLength = salt.length

export function generateKey(length = 32){
	function r(){ return Math.floor(Math.random()*saltLength) }
	let key = ''
	while (length--) {
		key += salt[r()]
	}
	return key
}