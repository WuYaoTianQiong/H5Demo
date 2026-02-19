import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import naive from 'naive-ui'
import { A11yFocusFix } from './plugins/a11y-focus-fix'
import './styles/variables.scss'
import './styles/a11y-fix.scss'
import './styles/components.scss'

A11yFocusFix.install()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(naive)
app.mount('#app')
