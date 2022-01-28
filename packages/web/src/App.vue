<script setup lang="ts">
import {onMounted, reactive} from 'vue'
import {ElMessage} from "element-plus"
import { Link } from '@element-plus/icons-vue'
import {IBlack, IConfigure, IConnect, IProxyItem, IProxyMappingInfo} from "../types"
import Api from './Api'
import {confirm, prompt, formatTime, bytesToSize, calcTime} from './Utils'
import ConnectView from './Connect.vue'
import BlackView from './Black.vue'

const StartPort = 2048
const state = reactive({
	activeName: 'proxy',
	form: { id: 0, info: '', lan: '', inetPort: 0, configureId: undefined, enable: true  } as IProxyMappingInfo,
	list: [] as IProxyItem[],
	configures: [] as IConfigure[],
	dialogVisible: false,
	ups: [] as number[],
	black: [] as IBlack[]
})


function getPort(s?: number){
	let curPort =  s === undefined ? StartPort : s
	for (let i = StartPort; i < 65535; i++){
		if (!state.configures.map(x => x.proxyMappings).flat().find(x => x.inetPort === i)){
			curPort = i
			break
		}
	}
	return curPort
}

function onCancel() {
	state.form = { id: 0, info: '', lan: '', inetPort: getPort(), configureId: undefined, enable: true }
}

async function reloadClient() {
	onCancel()
	state.black = await Api.black.list()
	state.configures = await Api.configure.list()
	let list = [] as IProxyItem[]
	for (const cfg of state.configures){
		for (const item of cfg.proxyMappings){
			const obj = {
				id: item.id, conf: cfg, children: [],
				map: Object.assign({ configureId: cfg.id! }, item)
			} as IProxyItem
			list.push(obj)
		}
	}
	state.list = list.sort((a, b) => {
		if (a.map!.configureId === b.map!.configureId){
			return (b.map!.enable ? 1 : 0) - (a.map!.enable ? 1 : 0)
		}
		return a.map!.configureId! - b.map!.configureId!
	})
	await reloadConfigureStatus()
}

async function reloadConfigureStatus(){
	try {
		const { ups, clients, conn } = await Api.status.status()
		for (const item of clients){
			const cfg = state.configures.find(x => x.id === item.id)
			if (!cfg) continue
			cfg.status = true
			cfg.address = item.address
			cfg.region = item.region
		}
		state.ups = ups
		for (const item of state.list){
			const list = conn.filter(x => x.localPort === item.map!.inetPort)
			if (list.length < 1) {
				item.children = []
				continue
			}
			item.children = list.map(x => { return { id: x.id, conn: x, children: [] } })
		}
	}catch {
		for (const item of state.configures){
			item.status = false
		}
	}
}

onMounted(function (){
	reloadClient()
	setInterval(reloadConfigureStatus, 1000)
})


async function saveConfigure(configure: IConfigure, title: string) {
	try {
		const res = await Api.configure.save(configure)
		if (res){
			ElMessage.success(title + '成功')
			state.dialogVisible = false
			await reloadClient()
			return
		}
	}catch{}
	ElMessage.error(title + '失败')
}

function onSubmit(){
	if (!state.form.configureId){
		return ElMessage.error('请选择客户端')
	}
	if (state.list.filter(x => x.map!.inetPort === state.form.inetPort).length > 0){
		return ElMessage.error('监听端口已被占用')
	}
	if (!state.form.lan) {
		return ElMessage.error('转发地址不可为空')
	}
	if (state.form.lan.split(':').length !== 2) {
		return ElMessage.error('转发地址格式错误')
	}
	const config = state.configures.find(x => x.id === state.form.configureId)!
	if (state.form.id === 0){
		state.form.id = Date.now()
	}else {
		config.proxyMappings = config.proxyMappings.filter(x => x.id !== state.form.id)
	}
	delete (state.form as any)['configureId']
	config.proxyMappings.push(state.form)
	saveConfigure(config, '保存代理配置')
}

async function onDelete(row: IProxyItem){
	if (!row.conf) return
	if (!await confirm('是否确认删除当前代理?', '删除代理')){
		return
	}
	row.conf.proxyMappings = row.conf.proxyMappings.filter(x => x.id !== row.map!.id)
	await saveConfigure(row.conf, '删除代理配置')
}

async function addClient() {
	try {
		const value = await prompt('请输入客户端名称', '添加客户端', '添加')
		if (!value) return
		if (state.configures.find(x => x.name === value)){
			return ElMessage.error('客户端名称已存在')
		}
		const res = await Api.configure.save({ name: value, key: generateKey(), proxyMappings: [] })
		if (res){
			ElMessage.success('添加客户端成功')
			await reloadClient()
		}else {
			ElMessage.error('添加客户端失败')
		}
	}catch {}
}

async function addProxy(){
	onCancel()
	state.dialogVisible = true
}

function onCopyProxy(row: IProxyItem) {
	state.form = JSON.parse(JSON.stringify(row.map))
	state.form.inetPort = getPort(state.form.inetPort)
	state.form.id = 0
	state.dialogVisible = true
}

function onEditProxy(row: IProxyItem){
	state.form = JSON.parse(JSON.stringify(row.map))
	state.dialogVisible = true
}

async function onEnable(row: IProxyItem){
	const conf = row.conf
	if (!conf) return
	row.map!.enable = !row.map!.enable
	delete (row.map as any)['configureId']
	conf.proxyMappings = conf.proxyMappings.filter(x => x.id !== row.map!.id) as any
	conf.proxyMappings.push(row.map!)
	await saveConfigure(conf, '修改状态')
}

function copy(text: string): void {
	try {
		const input = document.createElement('textarea')
		document.body.appendChild(input)
		input.value = text
		input.select()
		// noinspection JSDeprecatedSymbols
		if (document.execCommand('copy')) {
			ElMessage.success('已复制到剪切板')
		}
		document.body.removeChild(input)
	} catch (e) {
	}
}

function generateKey(){
	let s = [] as string[]
	let hexDigits = "0123456789abcdef"
	for (let i = 0; i < 40; i++) {
		s[i] = hexDigits[Math.floor(Math.random() * 0x10)]
	}
	s[8] = "@"
	s[12] = hexDigits[((s[11] as any) & 0x3) | 0x8]
	s[15] = s[2] = s[7] = s[9] = ""
	return s.join('')
}

async function onCommand(cfg: IConfigure, cmd: string){
	switch (cmd){
		case 'copyKey': copy(cfg.key); break
		case 'rename':
			try {
				const value = await prompt('请输入客户端名称', '重命名', '保存', cfg.name)
				if (!value || value === cfg.name) return
				if (state.configures.filter(x => x.name === value).length > 0){
					return ElMessage.error('客户端名称已存在')
				}
				cfg.name = value
				await saveConfigure(cfg, '重命名')
			}catch {}
			break
		case 'reGenerateKey':
			if (cfg.status){
				if (!await confirm('当前客户端在线，重新生成密钥后客户端将无法连接，是否继续?'))
					return
			}else {
				if (!await confirm('重新生成密钥后可能导致客户端无法连接，是否继续?'))
					return
			}
			cfg.key = generateKey()
			await saveConfigure(cfg, '重新生成密钥')
			break
		case 'delete':
			if (cfg.status){
				if (!await confirm('当前客户端在线，删除后所有连接用户都将强制中断，且该操作不可恢复，是否继续?'))
					return
			}else {
				if (!await confirm('即将删除客户端，该操作不可恢复，是否继续?'))
					return
			}
			try {
				const res = await Api.configure.remove(cfg.id!)
				if (res){
					ElMessage.success('删除客户端成功')
					await reloadClient()
				}else {
					ElMessage.error('删除客户端失败')
				}
			}catch {}
	}
}

async function forceClose(id: string){
	if (!await confirm('是否强制关闭当前选择连接?', '强制关闭')){
		return
	}
	if (await Api.forceClose(id)){
		ElMessage.success('该连接至多10秒内会被结束')
	}else {
		ElMessage.error('关闭连接失败')
	}
}

function isNotInBlack(row: IConnect) {
	return !state.black.find(x => x.ip === row.remoteIp)
}

async function addBlock(row: IConnect) {
	if (state.black.find(x => x.ip === row.remoteIp)) return
	if (!await confirm(`是否确定将${ row.remoteIp }加入黑名单，加入后，该地址的所有连接都将被服务端拒绝`, '加入黑名单')){
		return
	}
	if (await Api.black.save({ ip: row.remoteIp, time: Date.now(), enable: true, address: row.region })){
		ElMessage.success('添加黑名单成功')
		await reloadClient()
	} else {
		ElMessage.error('添加黑名单失败')
	}
}

</script>

<template>
	<div class="proxy-header">
		<div class="logo">Node Proxy</div>
	</div>
	<div class="proxy-content">
		<div class="client-list">
			<span style="color: #787878;">客户端列表：</span>
			<template v-for="item in state.configures" :key="item.name">
				<el-dropdown trigger="click" :hide-timeout="50" @command="cmd => onCommand(item, cmd)">
					<el-tag :class="{ conn: item.status }" class="client-tag state"  type="info" effect="plain" size="medium" onselectstart="return false">
						{{ item.name }} {{ item.address ? '(' + item.address + ')' : '' }}
					</el-tag>
					<template #dropdown>
						<el-dropdown-menu>
							<el-dropdown-item command="copyKey">复制密钥</el-dropdown-item>
							<el-dropdown-item divided></el-dropdown-item>
							<el-dropdown-item command="rename">重命名</el-dropdown-item>
							<el-dropdown-item command="reGenerateKey">重新生成密钥</el-dropdown-item>
							<el-dropdown-item divided></el-dropdown-item>
							<el-dropdown-item command="delete">删除客户端</el-dropdown-item>
						</el-dropdown-menu>
					</template>
				</el-dropdown>
			</template>
			<el-button type="primary" @click="addClient">添加客户端</el-button>
			<el-button type="primary" @click="addProxy" :disabled="state.configures.length < 1">添加代理</el-button>
		</div>
		<div class="list">
			<el-tabs v-model="state.activeName" type="card">
				<el-tab-pane name="proxy">
					<template #label>
						<el-icon>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 6.243V2h-4.243l1.411 1.41l-4.834 4.835a3.938 3.938 0 0 0-5.191 2.75H5.72a2 2 0 1 0 .005 2H8.14a3.94 3.94 0 0 0 5.204 2.757l4.83 4.83L16.758 22H21v-4.243l-1.41 1.411l-4.571-4.57a3.967 3.967 0 0 0 .841-1.603L18 13v2l3-3l-3-3v2l-2.143-.005a3.968 3.968 0 0 0-.844-1.6l4.57-4.57zM12 14a2 2 0 1 1 2-2a2 2 0 0 1-2 2z" fill="currentColor"></path></svg>
						</el-icon>
						<span style="margin-left: 5px;">代理列表</span>
					</template>
				</el-tab-pane>
				<el-tab-pane name="history">
					<template #label>
						<el-icon>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13.5 8H12v5l4.28 2.54l.72-1.21l-3.5-2.08V8M13 3a9 9 0 0 0-9 9H1l3.96 4.03L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.896 8.896 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9" fill="currentColor"></path></svg>
						</el-icon>
						<span style="margin-left: 5px;">流量历史</span>
					</template>
				</el-tab-pane>
				<el-tab-pane name="black">
					<template #label>
						<el-icon>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M1.41 1.69L0 3.1l1 .99V18h9v2H8v2h8v-2h-2v-2h.9l6 6l1.41-1.41l-20.9-20.9zM2.99 16V6.09L12.9 16H2.99zM4.55 2l2 2H21v12h-2.45l2 2h2.44V2z" fill="currentColor"></path></svg>
						</el-icon>
						<span style="margin-left: 5px;">黑名单</span>
					</template>
				</el-tab-pane>
			</el-tabs>
			<div style="width: 100%; height: calc(100% - 80px)">
				
				<el-table v-if="state.activeName === 'proxy'" :data="state.list" height="100%"
					border highlight-current-row row-key="id" default-expand-all>
					
					<el-table-column type="index" label="序号" align="center" width="50"></el-table-column>
					<el-table-column label="连接信息">
						<template #default="{ row }">
							<span v-if="row.map" style="font-size: 14px" class="state" :class="{ conn: state.ups.includes(row.map.inetPort) }">
								客户端
								<span v-if="row.conf.region"> [{{ row.conf.region }}] </span>
								<span v-if="row.conf.address"> {{ row.conf.address }} </span> {{ row.conf.name }}
								监听端口: {{ row.map.inetPort }} 转发至 {{ row.map.lan }}，
								当前连接: {{ row.children.length }}
								<span v-if="row.map.info">, 备注：{{ row.map.info }}</span>
							</span>
							<span v-else style="font-size: 14px;">
								<el-icon :size="16"><Link /></el-icon>
								<span v-if="row.conn.region"> [{{ row.conn.region }}] </span>
								{{ row.conn.remoteIp }}: {{ row.conn.remotePort }}
								于 {{ formatTime(row.conn.timestamp) }} 连接，
								已持续 {{ calcTime(row.conn.timestamp) }}，
								当前流量: ↑ {{ bytesToSize(row.conn.up) }} / ↓ {{ bytesToSize(row.conn.down) }}
							</span>
						</template>
					</el-table-column>
					<el-table-column label="操作" align="center" width="250">
						<template #default="{ row }">
							<div v-if="row.map">
								<el-button type="text" @click="onEnable(row)" :style="{ color: row.map.enable ? '#E6A23C' : '#67C23A' }">
									{{ row.map.enable ? '禁用' : '启用' }}
								</el-button>
								<el-button type="text" @click="onEditProxy(row)">编辑</el-button>
								<el-button type="text" @click="onCopyProxy(row)">复制</el-button>
								<el-button type="text" style="color: #F56C6C;" @click="onDelete(row)">删除</el-button>
							</div>
							<div v-else>
								<el-button type="text" v-if="isNotInBlack(row.conn)" @click='addBlock(row.conn)'>加入黑名单</el-button>
								<el-button type="text" style="color: #F56C6C;" @click='forceClose(row.conn.id)'>强制关闭</el-button>
							</div>
						</template>
					</el-table-column>
				</el-table>
				<connect-view v-else-if="state.activeName === 'history'"></connect-view>
				<black-view v-else></black-view>
			</div>
		</div>
	</div>
	<el-dialog v-model="state.dialogVisible" :title="state.form.id ? '编辑代理' : '添加代理'" width="450px" custom-class="shell-dialog" center>
		<el-form :model="state.form" label-width="100px" @submit.prevent>
			<el-form-item label="客户端">
				<el-select v-model.number="state.form.configureId" placeholder="请选择客户端" style="width: 100%;">
					<el-option v-for="item in state.configures" :key="item.id" :value="item.id" :label="item.name"/>
				</el-select>
			</el-form-item>
			<el-form-item label="监听端口">
				<el-input-number v-model="state.form.inetPort" controls-position="right" :min="1" :max="65535"/>
			</el-form-item>
			<el-form-item label="转发地址">
				<el-input v-model="state.form.lan" placeholder="格式: 127.0.0.1:8080，支持域名"></el-input>
			</el-form-item>
			<el-form-item label="备注">
				<el-input v-model="state.form.info" placeholder="备注"></el-input>
			</el-form-item>
		</el-form>
		<template #footer>
			<span class="dialog-footer">
				<el-button @click="state.dialogVisible = false">取消</el-button>
				<el-button type="primary" @click="onSubmit">{{ state.form.id === 0 ? '添加' : '修改' }}</el-button>
			</span>
		</template>
	</el-dialog>
</template>

<style lang="scss">
.shell-dialog {
	border-radius: 15px;

	& .el-dialog__header {
		  border-bottom: 1px solid rgba(204, 204, 204, 0.25);
	  }
	
	& .el-dialog__footer {
		  border-top: 1px solid rgba(204, 204, 204, 0.25);
		  padding-bottom: 10px;
	  }
}
</style>

<style lang="scss" scoped>
	.proxy-header {
		height: 60px; background-color: #23262E; position: relative;
		.logo { position: absolute;left: 0;top: 0;width: 200px;height: 100%;line-height: 60px;text-align: center;color: #409EFF;font-size: 20px; }
	}
	
	.proxy-content {
		height: calc(100% - 60px); overflow: hidden; margin: 10px;
		
		.client-list { height: 40px; line-height: 40px; margin-bottom: 10px;}
		.list { width: 100%; height: calc(100% - 50px); overflow: hidden;}
	}

	@-webkit-keyframes fade {
		from { opacity: 1.0; }
		50% { opacity: 0.5; }
		to { opacity: 1.0; }
	}

	.client-tag {
		cursor: pointer;
		height: 34px;
		line-height: 32px;
		margin-right: 10px;
		-webkit-user-select:none;
		user-select:none;
		-moz-user-select: none;
	}
	
	.state {
		&::before{
			-webkit-animation:fade 1500ms infinite;
			content: "";
			background: #F56C6C;
			display: inline-block;
			width: 8px;
			height: 8px;
			border-radius: 50%;
			position: relative;
			margin-right: 5px;
		}
		
		&.main::before{display: none;}
		
		&.conn::before{background: #67C23A;}
		
		&.select {--el-tag-border-color: #409eff; }
		
		&:hover {--el-tag-border-color: #409eff;}
	}
</style>
