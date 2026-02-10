import { createApp } from 'vue'
import './utils/utools-mock.js'
import router from './router'
import App from './App.vue'
import './main.css'

const app = createApp(App)

app.use(router)
app.mount('#app')
