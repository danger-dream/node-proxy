const fs = require('fs')
const { join } = require('path')

const root = join(__dirname, '../packages/app/.node-proxy')

if (!fs.existsSync(root)){
	fs.mkdirSync(root)
}

const configurePath = join(root, 'configure')
if (fs.existsSync(configurePath)){
	process.exit(0)
}

const configure = [
	{
		id: Date.now(),
		name: 'localhost',
		key: '123',
		proxyMappings: [
			{ id: Date.now(), name: 'baidu', lan: '127.0.0.1:3389', inetPort: 2048, enable: true }
		],
		status: true
	}
]
fs.writeFileSync(configurePath, JSON.stringify(configure, undefined, '\t'))