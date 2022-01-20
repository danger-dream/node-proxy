const fs = require('fs')
const { join } = require('path')
const rimraf = require('rimraf')

const app = join(__dirname, '../packages/app/dist/src')
const web = join(__dirname, '../packages/web/dist')

if (!fs.existsSync(app)){
	console.log('App未编译')
	process.exit(0)
}
if (!fs.existsSync(web)){
	console.log('WEB未编译')
	process.exit(0)
}


function copyFolder(srcPath, tarPath) {
	for (const file of fs.readdirSync(srcPath)){
		const tempSrcPath = join(srcPath, file);
		const tempTarPath = join(tarPath, file);
		if (fs.statSync(tempSrcPath).isDirectory()){
			if (!fs.existsSync(tempTarPath)){
				fs.mkdirSync(tempTarPath)
			}
			copyFolder(tempSrcPath, tempTarPath)
		}else {
			fs.copyFileSync(tempSrcPath, tempTarPath)
		}
	}
}

const dist = join(__dirname, '../dist')
rimraf.sync(dist)
fs.mkdirSync(dist)
copyFolder(app, dist)
const webDist = join(dist, 'dist')
fs.mkdirSync(webDist)
copyFolder(web, webDist)
rimraf.sync(app)
rimraf.sync(web)

