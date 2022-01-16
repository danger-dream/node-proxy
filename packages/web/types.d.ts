export declare interface IBlack {
	id?: number
	ip: string
	address: string
	time: number
	enable: boolean
}

export declare interface IProxyMapping {
	id?: number
	name: string
	inetPort: number
	lan: string
	enable: boolean
}

export declare interface IProxyMappingInfo extends IProxyMapping{
	configureId: number
}

export declare interface IConfigure {
	id?: number
	name: string
	key: string
	proxyMappings: IProxyMapping[]
	status?: boolean
	address?: string
}

export declare interface ISystem {
	enable: boolean
	timeout: number
	overseas: boolean
}

export interface IMetrics {
	label: string
	localPort: number
	lan: string
	up: number
	down: number
	connectNum: number
	children: IMetricsConnect[]
}

export interface IMetricsConnect {
	label: string
	remoteAddr: string
	remotePort: number
	localPort: number
	lan: string
	up: number
	down: number
	timestamp: number
	status: boolean
	clientId: string
	address: string
}

export interface IMetricsIP {
	label: string
	remoteAddr: string
	up: number
	down: number
	connectNum: number
	address: string
	children: IMetricsIPConnect[]
}

export interface IMetricsIPConnect {
	label: string
	remoteAddr: string
	remotePort: number
	localPort: number
	lan: string
	up: number
	down: number
	timestamp: number
	status: boolean
	clientId: string
	address: string
}
