# Node-Proxy

**nodejs实现的代理工具**

## Features
- 只使用了 [Node.js](https://nodejs.org/en/)
- [yarn](https://yarn.bootcss.com) monorepo管理依赖
- [pkg](https://github.com/vercel/pkg) 编译，可脱离Node环境使用
- 最精简的依赖
- 自带守护进程
- 实现了基础的TCP代理功能：代理客户端配置、流量监控、黑名单、强制断连、接入离线IP地址库 [node-maxmind](https://github.com/runk/node-maxmind) 、自动禁止国外IP连接

## Getting started
```bash
# clone the project
git clone https://github.com/hlxxzt/node-proxy.git

# enter the project web directory
cd node-proxy

# install dependency
yarn

# run test proxy server and client
yarn dev-app

# run web
yarn dev-web
```

browser open http://localhost:3000


## Build
```bash
# clone the project
git clone https://github.com/hlxxzt/node-proxy.git

# enter the project web directory
cd node-proxy

# install dependency and build. outpath: project/build
# compile using pkg.js
yarn && yarn build
```


## Usage
```bash
Usage: node-proxy [options]

  --help            Displays help
  --local           Profile in the local
  -d, --daemon      Use daemon - default: false
  -c, --client      client mode
  -s, --server      server mode
  -P, --port Int    Web listen port, client mode ignored - default: 80
  -p, --proxy-server-port Int  Proxy server listen port - default: 6900
  -h, --proxy-server-host String  Proxy server host, server mode ignored
  -k, --key String  Proxy server auth key, server mode ignored

Version:0.0.1

Examles:
- 启动服务端，web端口80，代理服务端端口6900，使用守护进程
 $ node-proxy -d -s -P 80 -p 6900
 
- 启动代理客户端，连接本地6900代理服务端，不使用守护进程
 $ node-proxy -c -p 6900 -h localhost -k 123456
 
- 启动服务端与代理客户端，web端口80，代理服务端端口6900，注：同时启动服务端与客户端必须使用守护进程模式
 $ node-proxy -d -s -c -P 80 -p 6900 -k 123456
```


#### 离线IP库下载：
1. [geolite2](https://dev.maxmind.com/geoip/geolite2-free-geolocation-data)
2. [geolite2-db](https://gitlab.com/leo108/geolite2-db)