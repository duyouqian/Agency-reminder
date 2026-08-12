import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotificationPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'

export const useSettingsStore = defineStore('settings', () => {
  const darkMode = ref(false)
  const alwaysOnTop = ref(false)
  const minimizeToTray = ref(true)
  const autoLaunch = ref(false)
  const quickAddKey = ref('Ctrl+Shift+T')
  const toggleMainKey = ref('Ctrl+Shift+F')
  const language = ref('zh-CN')
  const notificationPosition = ref<NotificationPosition>('bottom-right')

  // 周视图标题关键词搜索持久化
  const filterSearchQuery = ref('')
  const isReady = ref(false)
  const persistenceError = ref('')

  // Display formatted shortcut
  const quickAddKeyDisplay = computed(() => {
    return quickAddKey.value.replace(/CommandOrControl/g, 'Ctrl').replace(/\+/g, ' + ')
  })
  
  const toggleMainKeyDisplay = computed(() => {
    return toggleMainKey.value.replace(/CommandOrControl/g, 'Ctrl').replace(/\+/g, ' + ')
  })

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  async function saveStoreValue(key: string, value: unknown): Promise<OperationResult> {
    try {
      const result = await window.electronAPI.setStore(key, value)
      if (!result.success) {
        persistenceError.value = result.error || '设置保存失败'
        return result
      }
      persistenceError.value = ''
      return { success: true }
    } catch (error) {
      persistenceError.value = `设置保存失败：${getErrorMessage(error)}`
      return { success: false, error: persistenceError.value }
    }
  }

  async function loadSettings(): Promise<OperationResult> {
    isReady.value = false
    try {
      darkMode.value = await window.electronAPI.getStore('darkMode') || false
      alwaysOnTop.value = await window.electronAPI.getStore('alwaysOnTop') || false
      minimizeToTray.value = await window.electronAPI.getStore('minimizeToTray') ?? true
      autoLaunch.value = await window.electronAPI.getStore('autoLaunch') || false
      quickAddKey.value = await window.electronAPI.getConfig('quickAddKey') || 'Ctrl+Shift+T'
      toggleMainKey.value = await window.electronAPI.getConfig('toggleMainKey') || 'Ctrl+Shift+F'
      language.value = 'zh-CN'
      notificationPosition.value = await window.electronAPI.getStore('notificationPosition') || 'bottom-right'

      // 加载周视图标题关键词搜索
      filterSearchQuery.value = await window.electronAPI.getStore('filterSearchQuery') || ''

      // Apply settings
      if (alwaysOnTop.value) {
        if (!await window.electronAPI.setAlwaysOnTop(true)) {
          throw new Error('窗口置顶状态恢复失败')
        }
      }

      // Apply dark mode
      document.documentElement.classList.toggle('dark', darkMode.value)
      persistenceError.value = ''
      return { success: true }
    } catch (error) {
      persistenceError.value = `设置加载失败：${getErrorMessage(error)}`
      return { success: false, error: persistenceError.value }
    } finally {
      isReady.value = true
    }
  }

  async function setDarkMode(value: boolean): Promise<OperationResult> {
    const result = await saveStoreValue('darkMode', value)
    if (!result.success) return result
    darkMode.value = value
    document.documentElement.classList.toggle('dark', value)
    return { success: true }
  }

  async function setAlwaysOnTop(value: boolean): Promise<OperationResult> {
    try {
      const previous = alwaysOnTop.value
      if (!await window.electronAPI.setAlwaysOnTop(value)) {
        persistenceError.value = '窗口置顶设置失败'
        return { success: false, error: persistenceError.value }
      }
      const result = await saveStoreValue('alwaysOnTop', value)
      if (!result.success) {
        await window.electronAPI.setAlwaysOnTop(previous)
        return result
      }
      alwaysOnTop.value = value
      return { success: true }
    } catch (error) {
      persistenceError.value = `窗口置顶设置失败：${getErrorMessage(error)}`
      return { success: false, error: persistenceError.value }
    }
  }

  async function setMinimizeToTray(value: boolean): Promise<OperationResult> {
    try {
      if (!await window.electronAPI.minimizeToTray(value)) {
        persistenceError.value = '最小化到托盘设置失败'
        return { success: false, error: persistenceError.value }
      }
      minimizeToTray.value = value
      persistenceError.value = ''
      return { success: true }
    } catch (error) {
      persistenceError.value = `最小化到托盘设置失败：${getErrorMessage(error)}`
      return { success: false, error: persistenceError.value }
    }
  }

  async function setAutoLaunch(value: boolean): Promise<OperationResult> {
    try {
      const previous = autoLaunch.value
      if (!await window.electronAPI.setAutoLaunch(value)) {
        persistenceError.value = '开机自启设置失败'
        return { success: false, error: persistenceError.value }
      }
      const result = await saveStoreValue('autoLaunch', value)
      if (!result.success) {
        await window.electronAPI.setAutoLaunch(previous)
        return result
      }
      autoLaunch.value = value
      return { success: true }
    } catch (error) {
      persistenceError.value = `开机自启设置失败：${getErrorMessage(error)}`
      return { success: false, error: persistenceError.value }
    }
  }

  async function setQuickAddKey(key: string): Promise<OperationResult> {
    const result = await window.electronAPI.setConfig('quickAddKey', key)
    if (result.success) {
      quickAddKey.value = key
    }
    return result
  }

  async function setToggleMainKey(key: string): Promise<OperationResult> {
    const result = await window.electronAPI.setConfig('toggleMainKey', key)
    if (result.success) {
      toggleMainKey.value = key
    }
    return result
  }

  async function setNotificationPosition(position: NotificationPosition): Promise<OperationResult> {
    const result = await saveStoreValue('notificationPosition', position)
    if (!result.success) return result
    notificationPosition.value = position
    return { success: true }
  }

  async function setFilterSearchQuery(query: string): Promise<OperationResult> {
    const result = await saveStoreValue('filterSearchQuery', query)
    if (!result.success) return result
    filterSearchQuery.value = query
    return { success: true }
  }

  async function setTodayButtonPosition(position: { right: number; bottom: number }): Promise<OperationResult> {
    return saveStoreValue('todayBtnPosition', position)
  }

  return {
    darkMode,
    alwaysOnTop,
    minimizeToTray,
    autoLaunch,
    quickAddKey,
    quickAddKeyDisplay,
    toggleMainKey,
    toggleMainKeyDisplay,
    language,
    notificationPosition,
    filterSearchQuery,
    isReady,
    persistenceError,
    loadSettings,
    setDarkMode,
    setAlwaysOnTop,
    setMinimizeToTray,
    setAutoLaunch,
    setQuickAddKey,
    setToggleMainKey,
    setNotificationPosition,
    setFilterSearchQuery,
    setTodayButtonPosition
  }
})
