import { ElMessageBox } from 'element-plus/es'

export function confirm(msg: string, title: string = '') {
	return new Promise(r => {
		ElMessageBox.confirm(msg, title || '确认', {
			confirmButtonText: '确定',
			cancelButtonText: '取消',
			type: 'warning',
		}).then(() => r(true)).catch(() => r(false))
	})
}

export async function prompt(msg: string, title: string, btn: string, def = '') {
	try {
		const { value } = await ElMessageBox.prompt(msg, title, { confirmButtonText: btn, cancelButtonText: '取消', inputValue: def })
		return value === def ? '' : value
	}catch {}
	return ''
}

export function bytesToSize(bytes: number) {
	if (bytes === 0)
		return '0 B';
	const k = 1000;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return (bytes / Math.pow(k, i)).toPrecision(4) + ' ' + sizes[i];
}

function add0(m: number) {
	return m < 10 ? '0' + m : m
}

export function formatTime(shijianchuo: any) {
	const time = new Date(shijianchuo);
	const y = time.getFullYear();
	const m = time.getMonth() + 1;
	const d = time.getDate();
	const h = time.getHours();
	const mm = time.getMinutes();
	const s = time.getSeconds();
	return y + '-' + add0(m) + '-' + add0(d) + ' ' + add0(h) + ':' + add0(mm) + ':' + add0(s);
}

export function calcTime(time: string | number, endTime?: number | string): string {
	if (!time) return ''
	const start = new Date(time)
	const dt = (endTime ? new Date(endTime).getTime() : Date.now()) - start.getTime()
	const days = Math.floor(dt / (24 * 3600 * 1000))
	const leave1 = dt % (24 * 3600 * 1000)
	const hours = Math.floor(leave1 / (3600 * 1000))
	const leave2 = leave1 % (3600 * 1000)
	const minutes = Math.floor(leave2 / (60 * 1000))
	const seconds = Math.round((leave2 % (60 * 1000)) / 1000)
	return days + "天" + hours + "时" + minutes + "分" + seconds + "秒"
}