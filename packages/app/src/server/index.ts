import {join} from 'path'
import { URL } from 'url'
import express from 'express'
import controller from './Controller'
import { RunArgs } from '../../types'
import Store from './Store'

export default function(args: RunArgs){
	
	const store = new Store()
	
	const app = express();
	
	app.all('*', function (req, res, next) {
		res.header('Access-Control-Allow-Credentials', "true")
		res.header('Access-Control-Allow-Origin', '*')
		res.header("Access-Control-Allow-Headers", "*");
		res.header('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
		const token = req.params['token'] || req.query['token'] || req.headers['token']
		if (req.method === 'GET'){
			const url = new URL(`http://localhost${req.url}`)
			if (url.pathname === '/' && token !== store.token){
				res.end('token invalid')
				return
			}
		}else {
			if (token !== store.token){
				res.end('token invalid')
				return
			}
		}
		next()
	})
	
	app.use(express.text())
	app.use(express.static(join(__dirname, '../dist')))
	controller(app, args, store)
	app.listen(args.port, '0.0.0.0' ,() => console.log('Example app listening at http://localhost:' + args.port))
}