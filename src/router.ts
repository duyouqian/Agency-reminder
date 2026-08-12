import { createRouter, createWebHashHistory } from 'vue-router'
import MainView from './views/MainView.vue'
import NotificationView from './views/NotificationView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'main',
      component: MainView
    },
    {
      path: '/notification',
      name: 'notification',
      component: NotificationView
    }
  ]
})

export default router
