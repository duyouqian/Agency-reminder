import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { appBranding } from './config/branding'
import './style.css'

document.title = appBranding.displayName

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
