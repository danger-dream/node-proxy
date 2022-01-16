import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import { ElIcon } from 'element-plus'

createApp(App).use(ElementPlus, { size: 'small', zIndex: 3000, locale: zhCn }).use(ElIcon).mount('#app')
