import { app, globalShortcut, ipcMain } from 'electron'
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'
import type { ShortcutConfigKey } from './ipc-security'
import type { OperationResult } from './types'

interface SettingsStore {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
}

interface SettingsIpcDependencies {
  store: SettingsStore
  getMainWindow: () => BrowserWindow | null
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
  storeValueValidators: Record<string, (value: unknown) => boolean>
  configReadKeys: ReadonlySet<string>
  configWriteKeys: ReadonlySet<string>
  registerShortcut: (key: ShortcutConfigKey, accelerator: unknown) => boolean
  getErrorMessage: (error: unknown) => string
  log: (...args: unknown[]) => void
  logError: (...args: unknown[]) => void
}

export function registerSettingsIpcHandlers(dependencies: SettingsIpcDependencies) {
  const {
    store,
    getMainWindow,
    assertMainWindowSender,
    storeValueValidators,
    configReadKeys,
    configWriteKeys,
    registerShortcut,
    getErrorMessage,
    log,
    logError
  } = dependencies

  ipcMain.handle('get-store', (event, key) => {
    assertMainWindowSender(event)
    if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(storeValueValidators, key)) {
      throw new Error('拒绝读取未授权的配置键')
    }
    return store.get(key)
  })

  ipcMain.handle('set-store', (event, key, value): OperationResult => {
    assertMainWindowSender(event)
    if (typeof key !== 'string' || !storeValueValidators[key] || !storeValueValidators[key](value)) {
      return { success: false, error: '拒绝写入未授权或格式错误的配置' }
    }
    store.set(key, value)
    return { success: true }
  })

  ipcMain.handle('get-config', (event, key) => {
    assertMainWindowSender(event)
    if (typeof key !== 'string' || !configReadKeys.has(key)) {
      throw new Error('拒绝读取未授权的配置键')
    }
    return store.get(key)
  })

  ipcMain.handle('set-config', (event, key, value): OperationResult => {
    assertMainWindowSender(event)
    if (typeof key !== 'string' || !configWriteKeys.has(key)) {
      return { success: false, error: '拒绝写入未授权的配置键' }
    }

    if (key !== 'quickAddKey' && key !== 'toggleMainKey') {
      return { success: false, error: '拒绝写入未授权的配置键' }
    }

    const shortcutKey = key as ShortcutConfigKey
    if (typeof value !== 'string' || !value.trim()) {
      return { success: false, error: '快捷键不能为空' }
    }

    const oldKey = store.get(shortcutKey) as string
    if (oldKey) {
      try {
        globalShortcut.unregister(oldKey)
        log('注销旧快捷键:', oldKey)
      } catch (error) {
        logError('注销旧快捷键失败:', error)
      }
    }

    if (!registerShortcut(shortcutKey, value)) {
      const restored = oldKey ? registerShortcut(shortcutKey, oldKey) : true
      return {
        success: false,
        error: restored ? '快捷键注册失败，已保留旧快捷键' : '快捷键注册失败，旧快捷键恢复也失败'
      }
    }

    try {
      store.set(shortcutKey, value)
      log('保存新快捷键:', shortcutKey, '=', value)
      return { success: true }
    } catch (error) {
      globalShortcut.unregister(value)
      const restored = oldKey ? registerShortcut(shortcutKey, oldKey) : true
      return {
        success: false,
        error: restored
          ? `快捷键保存失败：${getErrorMessage(error)}`
          : `快捷键保存失败且旧快捷键恢复失败：${getErrorMessage(error)}`
      }
    }
  })

  ipcMain.handle('set-always-on-top', (event, flag) => {
    assertMainWindowSender(event)
    if (typeof flag !== 'boolean') return false
    getMainWindow()?.setAlwaysOnTop(flag)
    return true
  })

  ipcMain.handle('minimize-to-tray', (event, flag) => {
    assertMainWindowSender(event)
    if (typeof flag !== 'boolean') return false
    store.set('minimizeToTray', flag)
    return true
  })

  ipcMain.handle('set-auto-launch', (event, flag) => {
    assertMainWindowSender(event)
    if (typeof flag !== 'boolean') return false
    app.setLoginItemSettings({ openAtLogin: flag })
    return true
  })
}
