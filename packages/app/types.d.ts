export declare interface RunArgs {
	help: boolean
	/**
	 * 以客户端模式启动
	 */
	client: boolean
	/**
	 * 使用守护进程，异常自动重启
	 */
	daemon: boolean
	/**
	 * 服务方式运行，仅linux有效
	 */
	server: boolean
	/**
	 * web、api端口
	 */
	port: number
	/**
	 * 代理服务端端口
	 * 当启动服务端模式时，该值为代理服务端通讯端口
	 * 当启动客户端模式时，该值为连接代理服务端通讯端口
	 */
	proxyServerPort: number
	/**
	 * 仅客户端模式有效，代理服务端host
	 */
	proxyServerHost: string
	/**
	 * 仅客户端模式有效，服务端认证秘钥
	 */
	key: string
}

export declare interface ISystem {
	/**
	 * 是否允许国外连接
	 */
	overseas: boolean
	/**
	 * 启用代理服务
	 */
	enable: boolean
	/**
	 * 代理客户端认证超时时间，单位为秒
	 */
	timeout: number
}

export declare interface IBlack {
	id: number
	ip: string
	address: string
	time: number
	enable: boolean
}

export declare interface IProxyMapping {
	inetPort: number
	lan: string
	enable: boolean
}

export declare interface IConfigure {
	id: number
	name: string
	key: string
	proxyMappings: IProxyMapping[]
}