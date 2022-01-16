<script setup lang="ts">
import {nextTick, onMounted, reactive, ref, computed} from 'vue'
import { IConfigure, IProxyMappingInfo } from "../types"
import {ElMessage} from "element-plus"
import Api from './Api'
import RightStatistics from './RightStatistics.vue'
import {confirm, prompt} from './Utils'

const nameRef = ref<any>(null)
const tableRef = ref<any>(null)

const StartPort = 2048
const state = reactive({
	activeName: 'lan',
	form: { id: 0, name: '', lan: '', inetPort: 0, configureId: 0, enable: true } as IProxyMappingInfo,
	list: [] as IProxyMappingInfo[],
	configures: [] as IConfigure[],
	config: undefined as IConfigure | undefined
})

function onCancel() {
	let curPort =  StartPort
	for (let i = StartPort; i < 65535; i++){
		if (!state.list.find(x => x.inetPort === i)){
			curPort = i
			break
		}
	}
	state.form = { id: 0, name: '', lan: '', inetPort: curPort, configureId: 0, enable: true }
}

async function reloadClient() {
	onCancel()
	state.config = undefined
	state.configures = await Api.configure.list()
	let list = [] as IProxyMappingInfo[]
	for (const cfg of state.configures){
		for (const item of cfg.proxyMappings){
			list.push(Object.assign({ configureId: cfg.id! }, item))
		}
	}
	state.list = list.sort((a: IProxyMappingInfo, b: IProxyMappingInfo) => {
		if (a.enable === b.enable){
			if (a.configureId === b.configureId){
				return a.inetPort - b.inetPort
			}
			return a.configureId - b.configureId
		}else {
			return (b.enable ? 1 : 0) - (a.enable ? 1 : 0)
		}
	})
	await reloadConfigureStatus()
}

const filterList = computed(() => {
	if (state.config){
		return state.list.filter(x => x.configureId === state.config!.id)
	}
	return state.list
})

async function reloadConfigureStatus(){
	for (const item of state.configures){
		item.status = false
	}
	const res = await Api.status.configure()
	for (const item of res){
		const cfg = state.configures.find(x => x.id === item.id)
		if (!cfg) continue
		cfg.status = true
		cfg.address = item.address
	}
}

onMounted(function (){
	reloadClient()
	setInterval(reloadConfigureStatus, 5000)
})


async function saveConfigure(configure: IConfigure, title: string) {
	try {
		const res = await Api.configure.save(configure)
		if (res){
			ElMessage.success(title + '成功')
			await reloadClient()
			return
		}
	}catch{}
	ElMessage.error(title + '失败')
}

async function onEnable(row: IProxyMappingInfo){
	const configure = state.configures.find(x => x.id === row.configureId)
	if (!configure) return
	row.enable = !row.enable
	configure.proxyMappings = state.list.filter(x => x.configureId === row.configureId && x.id !== row.id)
	configure.proxyMappings.push(row)
	await saveConfigure(configure, '修改状态')
}

function onEdit(row: IProxyMappingInfo){
	state.config = state.configures.find(x => x.id === row.configureId)
	state.form = JSON.parse(JSON.stringify(row))
	nextTick(() => nameRef.value.focus())
}

function onSubmit(){
	if (!state.config) return
	if (state.list.filter(x => x.inetPort === state.form.inetPort).length > 1){
		return ElMessage.error('监听端口已被占用')
	}
	if (!state.form.lan) {
		return ElMessage.error('后端地址不可为空')
	}
	if (state.form.lan.split(':').length !== 2) {
		return ElMessage.error('后端地址格式错误')
	}
	if (state.form.id === 0){
		if (state.list.find(x => x.name === state.form.name)){
			return ElMessage.error('已存在同名代码')
		}
		state.form.id = Date.now()
	}else {
		state.config.proxyMappings = state.config.proxyMappings.filter(x => x.id !== state.form.id)
	}
	delete (state.form as any)['configureId']
	state.config.proxyMappings.push(state.form)
	saveConfigure(state.config, '保存代理配置')
}

function onDelete(row: IProxyMappingInfo){
	const cfg = state.configures.find(x => x.id === row.configureId)
	if (!cfg) return
	cfg.proxyMappings = cfg.proxyMappings.filter(x => x.id !== row.id)
	saveConfigure(cfg, '删除代理配置')
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

function onSelectClient(client: IConfigure | undefined){
	state.config = client
	if (!client) {
		onCancel()
	}
}

function copy(text: string): void {
	try {
		const input = document.createElement('textarea')
		document.body.appendChild(input)
		input.value = text
		input.select()
		let res = document.execCommand('copy')
		document.body.removeChild(input)
		if (res) {
			ElMessage.success('已复制到剪切板')
		}
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

</script>

<template>
	<div class="proxy-header">
		<div class="logo">
			Node Proxy
		</div>
	</div>
	<div class="proxy-client-list">
		<span style="color: #787878;">客户端列表：</span>
		<el-tag class="client-tag main" :class="{ select: !state.config }" type="info" effect="plain" size="medium"
		        @click="onSelectClient(undefined)" onselectstart="return false">
			全部 ({{ state.configures.length }})
		</el-tag>
		<template v-for="item in state.configures" :key="item.name">
			<el-dropdown trigger="click" :hide-timeout="50" @command="cmd => onCommand(item, cmd)">
				<el-tag :class="{ select: state.config && state.config?.key === item.key, conn: item.status }"
				        class="client-tag"  type="info" effect="plain" size="medium"
				        @click.stop="onSelectClient(item)"  onselectstart="return false">
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
	</div>
	<div class="proxy-left">
		<el-tabs model-value='lan'>
			<el-tab-pane label="代理列表" name="lan"></el-tab-pane>
		</el-tabs>
		<el-form :inline="true" :model="state.form" :disabled="!state.config" style='height: 50px;'>
			<el-form-item label="代理名称">
				<el-input v-model="state.form.name" placeholder="请输入代理名称" ref="nameRef" style="width: 180px;"></el-input>
			</el-form-item>
			<el-form-item label="外网端口">
				<el-input v-model="state.form.inetPort" placeholder="请输入外网端口" style="width: 80px;"></el-input>
			</el-form-item>
			<el-form-item label="后端地址">
				<el-input v-model="state.form.lan" placeholder="格式: 127.0.0.1:8080" style="width: 180px;"></el-input>
			</el-form-item>
			<el-form-item>
				<el-button type="primary" @click="onSubmit">{{ state.form.id === 0 ? '添加' : '修改' }}</el-button>
				<el-button v-if="state.form.id > 0" @click="onCancel">取消</el-button>
			</el-form-item>
		</el-form>
		<div style="width: 100%; height: calc(100% - 105px)">
			<el-table :data="filterList" style="width: 100%" height="100%" border highlight-current-row size="mini" ref="tableRef">
				<el-table-column type="index" label="序号" align="center" width="50"></el-table-column>
				<el-table-column prop="name" label="代理名称" align="center" width="180"/>
				<el-table-column prop="inetPort" label="外网端口" align="center" width="80"/>
				<el-table-column prop="lan" label="后端地址" align="center"></el-table-column>
				<el-table-column label="操作" align="center" width="150">
					<template #default="{ row }">
						<el-button type="text" @click="onEnable(row)" :style="{ color: row.enable ? '#E6A23C' : '#67C23A' }">
							{{ row.enable ? '禁用' : '启用' }}
						</el-button>
						<el-button type="text" @click="onEdit(row)">编辑</el-button>
						<el-button type="text" style="color: #F56C6C;" @click="onDelete(row)">删除</el-button>
					</template>
				</el-table-column>
			</el-table>
		</div>
	</div>
	<div class="proxy-right">
		<right-statistics></right-statistics>
	</div>
</template>

<style lang="scss" scoped>
	.proxy-header {
		position: absolute; top: 0; height: 60px;left: 0; right: 0; background-color: #23262E;
		.logo { position: absolute;left: 0;top: 0;width: 200px;height: 100%;line-height: 60px;text-align: center;color: #409EFF;font-size: 20px; }
	}
	
	.proxy-client-list {position: absolute; top: 65px; left: 0; right: 0; overflow: hidden; margin: 10px;}
	
	.proxy-left {position: absolute; top: 100px; bottom: 0; left: 0; width: calc(50% - 20px); overflow: hidden; margin: 10px;}
	
	.proxy-right {position: absolute; top: 100px; bottom: 0; right: 0; width: calc(50% - 20px); overflow: hidden; margin: 10px;}

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
