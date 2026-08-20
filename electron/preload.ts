import { contextBridge, ipcRenderer } from 'electron'
import type { Todo } from './types'
import type { ElectronAPI, NotificationElectronAPI } from './ipc-types'

const isNotificationWindow = process.argv.includes('--notification-window')

const notificationAPI: NotificationElectronAPI = {
  // 通知窗口只允许接收主进程推送的通知数据
  onNotificationData: (callback: (data: { title: string; body: string }) => void) => {
    ipcRenderer.on('notification-data', (_, data) => {
      if (!data || typeof data.title !== 'string' || typeof data.body !== 'string') return
      callback({ title: data.title, body: data.body })
    })
  },
  // 通知窗口关闭时清理监听器
  removeNotificationDataListeners: () => {
    ipcRenderer.removeAllListeners('notification-data')
  }
}

const mainAPI: ElectronAPI = {
  // Store
  getStore: (key: string) => ipcRenderer.invoke('get-store', key),
  setStore: (key: string, value: unknown) => ipcRenderer.invoke('set-store', key, value),
  
  // Config (存储路径等)
  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: unknown) => ipcRenderer.invoke('set-config', key, value),
  
  // Todos
  getAllTodos: () => ipcRenderer.invoke('get-all-todos'),
  saveTodos: (todos: Todo[]) => ipcRenderer.invoke('save-todos', todos),
  
  // Window
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.invoke('set-always-on-top', flag),
  minimizeToTray: (flag: boolean) => ipcRenderer.invoke('minimize-to-tray', flag),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Tags
  getTags: () => ipcRenderer.invoke('get-tags'),
  saveTags: (tags: string[]) => ipcRenderer.invoke('save-tags', tags),
  
  // Background Image
  saveBgImage: (imageData: string) => ipcRenderer.invoke('save-bg-image', imageData),
  getBgImage: () => ipcRenderer.invoke('get-bg-image'),
  deleteBgImage: () => ipcRenderer.invoke('delete-bg-image'),

  // Notification
  showNotification: (options: { title: string; body: string; position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' }) =>
    ipcRenderer.invoke('show-notification', options),

  // Storage
  selectStoragePath: () => ipcRenderer.invoke('select-storage-path'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  
  // System
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  setAutoLaunch: (flag: boolean) => ipcRenderer.invoke('set-auto-launch', flag),
  
  // Events
  onQuickAddTodo: (callback: () => void) => {
    ipcRenderer.on('quick-add-todo', callback)
  },

  removeQuickAddTodoListener: (callback: () => void) => {
    ipcRenderer.removeListener('quick-add-todo', callback)
  },

  // Notification（主窗口一般不会收到通知事件，但保留校验以防主进程误发）
  onNotificationData: (callback: (data: { title: string; body: string }) => void) => {
    ipcRenderer.on('notification-data', (_, data) => {
      if (!data || typeof data.title !== 'string' || typeof data.body !== 'string') return
      callback({ title: data.title, body: data.body })
    })
  },
  removeNotificationDataListeners: () => {
    ipcRenderer.removeAllListeners('notification-data')
  }
}

contextBridge.exposeInMainWorld('electronAPI', isNotificationWindow ? notificationAPI : mainAPI)
