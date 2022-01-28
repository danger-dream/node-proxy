# v0.0.4

### Features
* 重构流量监控代码
* 根据个人使用情况重新优化前端页面，使用描述型列表展示数据

---

# v0.0.3

### Bug fix

* [app] 删除60秒未通讯自动断连的逻辑（ssh连接时经常断）
* [app] 修复BufferHandle模块在解包时因cache长度不足4字节导致readInt32LE读取异常的问题
* [pkg] 移除linux-arm64、macos-x64打包，因为我用不到

---


# v0.0.2

### Bug fix

* [pkg]修复pkg打包后因node12不存在cluster.isPrimary方法导致闪退的问题


### Features

* [web]增加web端token验证，初次启动随机生成160位字符作为密钥，http请求必须携带url参数token
* [app]add build latest-win-x64
* [app]增加数据加密，使用默认密钥加8字节随机密钥对数据包进行加密