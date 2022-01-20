import type { Express } from 'express'
import type { IConfigure, IBlack, RunArgs } from '../../types'
import ProxyServer from './ProxyServer'
import Store from './Store'

export default function(app: Express, args: RunArgs, store: Store){

	function registerApi(path: string, handlers: (body: any) => any, json: boolean = false): void {
		app.post('/api' + path, function(req, res){
			let args = req.body
			if (json){
				try {
					args = JSON.parse(req.body)
				}catch {
					res.end()
					return
				}
			}
			try {
				const result = handlers(args)
				if (result === null || result === undefined){
					res.end()
					return
				}
				res.json({ success: true, data: result })
			}catch (e) {
				res.json({ success: false, msg: e.message })
			}
		})
	}
	
	const proxyServer = new ProxyServer(args.proxyServerPort, store)
	
	registerApi('/configure', () => store.configure.query())
	
	registerApi('/configure/save', function(body: IConfigure): boolean {
		const res = (body.id ? store.configure.update(body) : store.configure.insert(body)) > 0
		res && store.changeConfigure()
		return res
	}, true)
	
	registerApi('/configure/remove', function(id: number): any {
		if (id === undefined || id < 1) return false
		const res = store.configure.remove(parseInt(id + ''))
		res && store.changeConfigure()
		return res
	})
	
	registerApi('/black', () => store.black.query())
	
	registerApi('/black/save', (body: IBlack) => (body.id ? store.black.update(body) : store.black.insert(body)) > 0, true)
	
	registerApi('/black/remove', function(id: string): any {
		if (!id) return false
		return store.black.remove(parseInt(id))
	})
	
	registerApi('/system', () => store.system)
	
	registerApi('/system/update', (body) => store.setSystem(body), true)
	
	registerApi('/status/configure', function(){
		return Object.keys(store.proxyClientMap).map(x => {
			return { id: parseInt(x), address: store.proxyClientMap[x]!.socket.remoteAddress }
		})
	})
	
	registerApi('/status/metrics', () => store.metrics.getMetricsTree())
	
	registerApi('/status/metricsIp', () => store.metrics.getMetricsIdTree())

	registerApi('/forceClose', (id: string) => store.userProxyServer.closeClient(id))
	
	proxyServer.start()
}