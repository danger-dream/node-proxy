<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import {ElMessage} from "element-plus";
import {IBlack} from "../types";
import Api from "./Api";
import {confirm, formatTime} from './Utils'

const state = reactive({
	black: [] as IBlack[]
})

onMounted(() => {
	reload()
})

async function reload(){
	state.black = await Api.black.list()
}

async function removeBlock(id: number) {
	if (!await confirm(`是否确定将该地址移出黑名单?`, '移出黑名单')){
		return
	}
	if (await Api.black.remove(id)){
		ElMessage.success('移出黑名单成功')
		await reload()
	} else {
		ElMessage.error('移出黑名单失败')
	}
}

</script>

<template>
	<el-table :data="state.black" height="100%" border highlight-current-row size="mini">
		<el-table-column type="index" label="序号" align="center" width="50"></el-table-column>
		<el-table-column label="黑名单信息">
			<template #default='{ row }'>
				<span v-if="row.address"> [{{ row.address }}] </span>
				{{ row.ip }} 于 {{ formatTime(row.time) }} 加入黑名单
			</template>
		</el-table-column>
		<el-table-column label="操作" align="center" width="150">
			<template #default="{ row }">
				<el-button type="text" @click='removeBlock(row.id)'>移出黑名单</el-button>
			</template>
		</el-table-column>
	</el-table>
</template>