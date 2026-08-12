/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

type OperationResult<T = undefined> = import('../electron/types').OperationResult<T>
type StorageSelectionData = import('../electron/types').StorageSelectionResult
type ElectronTodo = import('../electron/types').Todo

interface Window {
  electronAPI: {
    getStore: (key: string) => Promise<any>
    setStore: (key: string, value: any) => Promise<OperationResult>
    getConfig: (key: string) => Promise<any>
    setConfig: (key: string, value: any) => Promise<OperationResult>
    getAllTodos: () => Promise<OperationResult<ElectronTodo[]>>
    saveTodos: (todos: ElectronTodo[]) => Promise<OperationResult>
    setAlwaysOnTop: (flag: boolean) => Promise<boolean>
    minimizeToTray: (flag: boolean) => Promise<boolean>
    minimizeWindow: () => Promise<boolean>
    maximizeWindow: () => Promise<boolean>
    closeWindow: () => Promise<boolean>
    getTags: () => Promise<OperationResult<string[]>>
    saveTags: (tags: string[]) => Promise<OperationResult>
    selectStoragePath: () => Promise<OperationResult<StorageSelectionData>>
    getStorageInfo: () => Promise<{ dataPath: string; tagsPath: string }>
    openExternal: (url: string) => Promise<OperationResult>
    setAutoLaunch: (flag: boolean) => Promise<boolean>
    onQuickAddTodo: (callback: () => void) => void
    removeQuickAddTodoListener: (callback: () => void) => void
    onNotificationData: (callback: (data: { title: string; body: string }) => void) => void
    removeNotificationDataListeners: () => void
    showNotification: (options: { title: string; body: string; position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' }) => Promise<OperationResult>
    saveBgImage: (imageData: string) => Promise<string | null>
    getBgImage: () => Promise<string | null>
    deleteBgImage: () => Promise<OperationResult>
  }
}
