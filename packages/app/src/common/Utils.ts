
export function S4(): string {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)
}

export function UUID(): string {
	return S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4()
}
export function deepClone<T>(target: T): T {
	let result
	if (typeof target === 'object') {
		if (Array.isArray(target)) {
			result = []
			for (let item of target) {
				result.push(deepClone(item))
			}
		} else if (target === null) {
			result = null
		} else {
			result = {} as any
			for (let k of Object.keys(target)) {
				result[k] = deepClone((target as any)[k])
			}
		}
	} else {
		result = target
	}
	return result as T
}
