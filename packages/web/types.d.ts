export declare interface IBlack {
	id?: number
	ip: string
	address: string
	time: number
	enable: boolean
}

export declare interface IProxyMapping {
	id?: number
	inetPort: number
	lan: string
	enable: boolean
	info: string
}

export declare interface IProxyMappingInfo extends IProxyMapping{
	configureId?: number
}

export declare interface IProxyItem {
	id: number | string
	map?: IProxyMappingInfo
	conf?: IConfigure
	conn?: IConnect
	children: IProxyItem[]
}

export declare interface IConfigure {
	id?: number
	name: string
	key: string
	proxyMappings: IProxyMapping[]
	status?: boolean
	address?: string
	region?: string
}

export declare interface ISystem {
	enable: boolean
	timeout: number
	overseas: boolean
}

export declare interface IConnect {
	id: string
	remoteIp: string
	remotePort: number
	localPort: number
	up: number
	down: number
	timestamp: number
	endTime: number
	region: string
	status: boolean
}