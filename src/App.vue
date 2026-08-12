<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useSettingsStore } from './stores/settings'
import { useTodoStore } from './stores/todo'

const settingsStore = useSettingsStore()
const todoStore = useTodoStore()
const isNotificationWindow = window.location.hash.startsWith('#/notification')

onMounted(async () => {
  // 通知窗口使用低权限 preload，只负责展示主进程推送的通知数据
  if (isNotificationWindow) return

  await Promise.all([
    settingsStore.loadSettings(),
    todoStore.loadTodos()
  ])
})

// Watch dark mode changes and apply in real-time
watch(() => settingsStore.darkMode, (newValue) => {
  document.documentElement.classList.toggle('dark', newValue)
}, { immediate: true })
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
