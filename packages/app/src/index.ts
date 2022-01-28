import cluster from 'cluster'
import Optionator from 'optionator'
import { RunArgs } from '../types'
import Server from './server'
import Client from './client'
import pkg = require('../package.json')

function runProxy (args: RunArgs, server: boolean) {
	if (server){
		Server(args)
	}else {
		Client(args)
	}
}

if (cluster['isMaster'] || cluster.isPrimary){
	const optionator = Optionator({
		prepend: `Usage: ${ pkg.name } [options]`,
		append: 'Version:' + pkg.version,
		options: [
			{ option: 'help', type: 'Boolean', description: 'Displays help' },
			{ option: 'daemon', alias: 'd', type: 'Boolean', default: 'false', description: 'Use daemon' },
			{ option: 'client', alias: 'c', type: 'Boolean', description: 'client mode' },
			{ option: 'server', alias: 's', type: 'Boolean', description: 'server mode' },
			{ option: 'port', alias: 'P', type: 'Int', default: '80', description: 'Web listen port, client mode ignored' },
			{ option: 'proxy-server-port', alias: 'p', type: 'Int', default: '6900', description: 'Proxy server listen port' },
			{ option: 'proxy-server-host', alias: 'h', type: 'String', description: 'Proxy server host, server mode ignored' },
			{ option: 'key', alias: 'k', type: 'String', description: 'Proxy server auth key, server mode ignored' }
		]
	});
	if (process.argv.includes('--help')) {
		console.log(optionator.generateHelp())
		process.exit()
	}
	const args = optionator.parseArgv(process.argv.includes('--project') ? process.argv.slice(2) : process.argv) as RunArgs
	if (!args.client && !args.server){
		args.server = true
	}
	
	if (args.daemon){
		function start (server = true){
			let reStart = true
			const worker = cluster.fork()
			worker.on('online', function(){
				worker.send(JSON.stringify({ args, action: 'run', server }))
			}).on('exit', function(){
				if (!reStart) return
				setTimeout(() => start(server), 2000)
			}).on('message', function(msg){
				if (msg >= 400){
					reStart = false
				}
			})
		}
		args.server && start(true)
		if (args.server && args.client){
			setTimeout(function(){
				start(false)
			}, 2000)
		}else if (args.client){
			start(false)
		}
	}else {
		if (args.client && args.server){
			console.log('无法在非守护进行模式中同时启动代理服务端与代理客户端')
			console.log(optionator.generateHelp())
			process.exit()
		}else {
			runProxy(args, args.server)
		}
	}
}else {
	process.on('message', function(msg){
		try {
			const { action, args, server } = JSON.parse(msg + '')
			if (action === 'run'){
				runProxy(args, server)
			}
		}catch {}
	})
}
