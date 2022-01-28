<script setup lang="ts">
import { reactive, onMounted, computed } from 'vue'
import {ElMessage} from "element-plus";
import { Link } from '@element-plus/icons-vue'
import {IBlack, IConfigure, IConnect} from "../types";
import Api from "./Api";
import {confirm, formatTime, bytesToSize, calcTime} from './Utils'

const state = reactive({
	configures: [] as IConfigure[],
	list: [] as IConnect[],
	black: [] as IBlack[]
})

onMounted(() => {
	reload()
})

async function reload(){
	state.configures = await Api.configure.list()
	state.list = await Api.status.getAll()
	state.black = await Api.black.list()
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
		await reload()
	} else {
		ElMessage.error('添加黑名单失败')
	}
}

async function removeBlock(row: IConnect) {
	if (!await confirm(`是否确定将该地址移出黑名单?`, '移出黑名单')){
		return
	}
	const black = state.black.find(x => x.ip === row.remoteIp)
	if (!black) return
	if (await Api.black.remove(black.id!)){
		ElMessage.success('移出黑名单成功')
		await reload()
	} else {
		ElMessage.error('移出黑名单失败')
	}
}

const list = computed(() => {
	const res = []
	for (const item of state.list) {
		const conf = state.configures.find(x => x.proxyMappings.find(p => p.inetPort === item.localPort))
		if (conf){
			res.push(Object.assign(item, { conf, map: conf.proxyMappings.find(x => x.inetPort === item.localPort) }))
		}else {
			res.push(item)
		}
	}
	return res
})

</script>

<template>
	<el-table :data="list" height="100%" border highlight-current-row size="mini">
		<el-table-column type="index" label="序号" align="center" width="50"></el-table-column>
		<el-table-column label="连接信息">
			<template #default='{ row }'>
				<el-icon :size="16"><Link /></el-icon>
				<span v-if="row.region"> [{{ row.region }}] </span>
				{{ row.remoteIp }}: {{ row.remotePort }}
				于 {{ formatTime(row.timestamp) }} 至 {{ formatTime(row.endTime) }} 连接至
				<span v-if="row.conf">{{ row.conf.name }} 客户端 {{ row.localPort }} -> {{row.map.lan}}</span>
				<span v-else>已删除客户端{{ row.localPort }}端口</span>
				，共持续 {{ calcTime(row.timestamp, row.endTime) }}，
				共消耗流量: ↑ {{ bytesToSize(row.up) }} / ↓ {{ bytesToSize(row.down) }}
			</template>
		</el-table-column>
		<el-table-column label="操作" align="center" width="150">
			<template #default="{ row }">
				<el-button type="text" v-if="isNotInBlack(row.conn)" @click='addBlock(row.remoteIp)'>加入黑名单</el-button>
				<el-button type="text" v-else @click='removeBlock(row)'>移出黑名单</el-button>
			</template>
		</el-table-column>
	</el-table>
</template>