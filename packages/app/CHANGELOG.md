
# v0.0.2

### Bug fix

* 修复pkg打包后因node12不存在cluster.isPrimary方法导致闪退的问题


### Features

* 增加web端token验证，初次启动随机生成160位字符作为密钥，http请求必须携带url参数token
* 增加数据加密，使用默认密钥加8字节随机密钥对数据包进行加密