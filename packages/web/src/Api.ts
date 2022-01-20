import axios from "axios";
import { IConfigure, ISystem, IBlack, IMetrics, IMetricsIP } from '../types'

function getQueryVariable(variable: string): string {
	const query = window.location.search.substring(1);
	const vars = query.split("&");
	for (const item of vars){
		const pair = item.split("=")
		if (pair[0] === variable)
			return pair[1]
	}
	return ''
}

const token = getQueryVariable('token')
if (!token){
	window.close()
}

async function post(uri: string, params: any = {}): Promise<any>{
	const res = await axios({
		method: 'POST',
		url: '/api' + uri + '?token=' + token,
		data: typeof params === 'string' ? params : JSON.stringify(params || {}),
		headers: {
			'content-type': 'text/plain'
		}
	})
	if (res.status !== 200){
		throw new Error('请求服务端失败')
	}
	if (!res.data.success){
		throw new Error('请求失败：' + (res.data.msg || ''))
	}
	return res.data.data ? res.data.data : true
}

export default {
	configure: {
		async list(): Promise<IConfigure[]> {
			return await post('/configure')
		},
		async save(cfg: IConfigure): Promise<boolean> {
			return await post('/configure/save', cfg)
		},
		async remove(id: number): Promise<boolean> {
			return await post('/configure/remove', id)
		}
	},
	black: {
		async list(): Promise<IBlack[]> {
			return await post('/black')
		},
		async save(black: IBlack): Promise<boolean> {
			return await post('/black/save', black)
		},
		async remove(id: number): Promise<boolean> {
			return await post('/black/remove', id)
		}
	},
	system: {
		async get(): Promise<ISystem> {
			return await post('/system')
		},
		async update(system: ISystem){
			return await post('/system/update', system)
		}
	},
	status: {
		async configure(): Promise<{ id: number, address: string }[]>{
			return await post('/status/configure')
		},
		async metrics(): Promise<IMetrics[]>{
			const res = await post('/status/metrics') as IMetrics[]
			for (const item of res){
				item.label = item.localPort + ' -> ' + item.lan
				for (const sub of item.children){
					sub.label = `[${ sub.address }]${ sub.remoteAddr }:${ sub.remotePort }`
				}
			}
			return res
		},
		async metricsIp(): Promise<IMetricsIP[]>{
			const res = await post('/status/metricsIp') as IMetricsIP[]
			for (const item of res){
				item.label = '[' + item.address + ']' + item.remoteAddr
				for (const sub of item.children){
					sub.label = `${ sub.remotePort } -> ${ sub.localPort } -> ${ sub.lan }`
				}
			}
			return res
		}
	},
	async forceClose(id: string): Promise<boolean>{
		return await post('/forceClose', id)
	}
}