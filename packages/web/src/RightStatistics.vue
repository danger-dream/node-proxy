<script setup lang="ts">
	import { reactive, onMounted, watch } from 'vue'
	import { IBlack, IMetrics, IMetricsIP } from '../types'
	import Api from "./Api";
	import { formatTime, bytesToSize, confirm, calcTime } from './Utils'
	import {ElMessage} from "element-plus"

	const state = reactive({
		activeName: 'metrics',
		list: [] as IMetrics[] | IMetricsIP[],
		black: [] as IBlack[],
		autoReload: '0',
		metricsMode: 'metrics'
	})

	async function reload(){
		if (state.activeName === 'metrics'){
			if (parseInt(state.autoReload) >= 5){
				state.black = await Api.black.list()
			}
			if (state.metricsMode === 'metrics'){
				state.list = await Api.status.metrics()
			}else{
				state.list = await Api.status.metricsIp()
			}
		}else {
			state.black = await Api.black.list()
		}
	}
	let interval = 0
	watch(() => state.autoReload, (v: string) => {
		if (v === '0'){
			clearInterval(interval)
		}else {
			clearInterval(interval)
			interval = setInterval(reload, parseInt(v) * 1000)
		}
	})
	
	watch(() => state.activeName, () => reload())
	
	watch(() => state.metricsMode, () => reload())
	
	onMounted(() => {
		state.autoReload = '10'
		reload()
	})
	
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
	
	function isBlack(row: any): boolean {
		return (state.metricsMode === 'metrics' ? !row.children : !!row.children) &&
			!state.black.find(x => x.ip === row.remoteAddr)
	}
	
	async function addBlock(row: any){
		if (state.black.find(x => x.ip === row.remoteAddr)) return
		if (!await confirm(`是否确定将${ row.remoteAddr }加入黑名单，加入后，该地址的所有连接都将被服务端拒绝`, '加入黑名单')){
			return
		}
		if (await Api.black.save({ ip: row.remoteAddr, time: Date.now(), enable: true, address: row.address })){
			ElMessage.success('添加黑名单成功')
			await reload()
		} else {
			ElMessage.error('添加黑名单失败')
		}
	}
	
	async function removeBlock(row: IBlack){
		if (!row || !row.id) return
		if (!await confirm(`是否确定将${ row.ip }移出黑名单?`, '移出黑名单')){
			return
		}
		if (await Api.black.remove(row.id)){
			ElMessage.success('移出黑名单成功')
			await reload()
		}else {
			ElMessage.error('移出黑名单失败')
		}
	}
</script>

<template>
	<el-tabs v-model="state.activeName" class="statistics-tabs">
		<el-tab-pane label="流量监控" name="metrics">
			<div style="width: 100%; height: 50px;">
				<el-radio-group v-model="state.metricsMode">
					<el-radio-button label="metrics">连接监控</el-radio-button>
					<el-radio-button label="metricsIP">IP监控</el-radio-button>
				</el-radio-group>
				<div style="float: right;">
					<el-select v-model="state.autoReload" placeholder="自动刷新">
						<el-option label="手动刷新" value="0"></el-option>
						<el-option label="自动刷新 - 1秒" value="1"></el-option>
						<el-option label="自动刷新 - 5秒" value="5"></el-option>
						<el-option label="自动刷新 - 10秒" value="10"></el-option>
						<el-option label="自动刷新 - 30秒" value="30"></el-option>
					</el-select>
					<el-button type="primary" @click="reload" style='margin-left: 10px;'>刷新</el-button>
				</div>
			</div>
			<div style="width: 100%; height: calc(100% - 58px)">
				<el-table :data="state.list" style="width: 100%" height="100%" border highlight-current-row size="mini" row-key="label"
				          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }" default-expand-all>
					<el-table-column label="连接信息">
						<template #default='{ row }'>
							{{ row.label }} {{ row.connectNum > 0 ? '(' + row.connectNum + ')' : '' }}
							<div v-if='row.status !== undefined' class='conn-status' :class='{ conn: row.status }'></div>
						</template>
					</el-table-column>
					<el-table-column label="上传" align="center" width="80">
						<template #default="{ row }">{{ bytesToSize(row.up) }}</template>
					</el-table-column>
					<el-table-column label="下载" align="center" width="80">
						<template #default="{ row }">{{ bytesToSize(row.down) }}</template>
					</el-table-column>
					<el-table-column label="连接时间" align="center" width="140">
						<template #default="{ row }">
							<template v-if='row.timestamp'>
								<span v-if='row.status'>{{ calcTime(row.timestamp) }}</span>
								<span v-else>{{ formatTime(row.timestamp) }}</span>
							</template>
							<template v-else>-</template>
						</template>
					</el-table-column>
					<el-table-column label="操作" align="center" width="160">
						<template #default="{ row }">
							<el-button type="text" v-if="isBlack(row)" @click='addBlock(row)'>加入黑名单</el-button>
							<el-button type="text" style="color: #F56C6C;" v-if="row.clientId && row.status" @click='forceClose(row.clientId)'>强制关闭</el-button>
						</template>
					</el-table-column>
				</el-table>
			</div>
		</el-tab-pane>
		
		<el-tab-pane label="黑名单" name="black">
			<div style="width: 100%; height: 50px;">
				<el-button type="primary" @click="reload" style='float: right'>刷新</el-button>
			</div>
			<div style="width: 100%; height: calc(100% - 58px)">
				<el-table :data="state.black" style="width: 100%" height="100%" border highlight-current-row size="mini">
					<el-table-column type='index' align='center' width='55'></el-table-column>
					<el-table-column prop='address' label="地址" width='80'></el-table-column>
					<el-table-column prop='ip' label="IP"></el-table-column>
					<el-table-column label="添加时间" align="center" width="140">
						<template #default="{ row }">{{ formatTime(row.time) }}</template>
					</el-table-column>
					<el-table-column label="操作" align="center" width="100">
						<template #default="{ row }">
							<el-button type="text" @click='removeBlock(row)'>移除黑名单</el-button>
						</template>
					</el-table-column>
				</el-table>
			</div>
		</el-tab-pane>
	</el-tabs>
</template>

<style>
	.statistics-tabs { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
	.statistics-tabs > .el-tabs__content { height: calc(100% - 48px); }
	.statistics-tabs > .el-tabs__content .el-tab-pane { height: 100%;}
</style>

<style lang='scss' scoped>
@-webkit-keyframes fade {
	from { opacity: 1.0; }
	50% { opacity: 0.5; }
	to { opacity: 1.0; }
}
.conn-status {
	display: inline-block;
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
	&.conn::before{background: #67C23A;}
}
</style>