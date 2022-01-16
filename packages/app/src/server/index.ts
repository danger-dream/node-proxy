import {join} from 'path'
import express from 'express'
import controller from './Controller'
import { RunArgs } from '../../types'

export default function(args: RunArgs){
	
	const app = express();
	
	app.all('*', function (_, res, next) {
		res.header('Access-Control-Allow-Credentials', "true")
		res.header('Access-Control-Allow-Origin', '*')
		res.header("Access-Control-Allow-Headers", "*");
		res.header('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
		next()
	})
	
	app.use(express.text())
	app.use(express.static(join(__dirname, '../dist')))
	controller(app, args)
	app.listen(args.port, () => console.log('Example app listening at http://localhost:' + args.port))
}