import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import { pathToFileURL } from 'url'
import type { IpcMainInvokeEvent } from 'electron'
import { captureR05WindowEvidence } from './utils'
import { appBranding } from '../src/config/branding'

interface MainWindowManagerOptions {
  isDev: boolean
  appVersion: string
  preloadPath: string
  developmentUrl: string
  productionIndexPath: string
  getMinimizeToTray: () => boolean
  hasUnsavedChanges: () => boolean
  isQuitting: () => boolean
  setQuitting: (value: boolean) => void
}

export function createMainWindow(options: MainWindowManagerOptions): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    minWidth: 380,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    show: true,
    title: appBranding.displayName,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 移除默认英文菜单，设置中文菜单
  const template: any[] = [
    {
      label: '文件',
      submenu: [
        { label: '显示主窗口', click: () => mainWindow.show() },
        { type: 'separator' },
        { label: '退出', click: () => {
          options.setQuitting(true)
          app.quit()
        } }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        { label: `关于 ${appBranding.displayName}`, click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: `关于 ${appBranding.displayName}`,
            message: `${appBranding.displayName} v${options.appVersion}`,
            detail: appBranding.description
          })
        } }
      ]
    }
  ]

  if (options.isDev) {
    template.splice(2, 0, {
      label: '视图',
      submenu: [
        { label: '刷新', role: 'reload' },
        { label: '强制刷新', role: 'forceReload' },
        { type: 'separator' },
        { label: '开发者工具', role: 'toggleDevTools' }
      ]
    })
  }

  mainWindow.setMenu(Menu.buildFromTemplate(template))

  const expectedProductionUrl = pathToFileURL(options.productionIndexPath).toString()
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (options.isDev) return
    const isDevToolsShortcut = input.key === 'F12'
      || ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i')
    if (isDevToolsShortcut) event.preventDefault()
  })
  mainWindow.webContents.on('console-message', details => {
    if (details.level === 'warning' || details.level === 'error') {
      console.error(
        `[主窗口渲染器:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`
      )
    }
  })
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) {
      console.error(`[主窗口加载失败] ${errorCode} ${errorDescription} ${validatedURL}`)
    }
  })
  mainWindow.webContents.on('did-finish-load', () => {
    void captureR05WindowEvidence(mainWindow, 'r05-main')
  })
  if (process.env.R05_UI_REPORT_DIR) {
    const evidenceTimer = setInterval(() => {
      void captureR05WindowEvidence(mainWindow, 'r05-main-live')
    }, 1000)
    mainWindow.on('closed', () => {
      clearInterval(evidenceTimer)
    })
  }
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    let allowed = false
    try {
      if (options.isDev) {
        allowed = new URL(targetUrl).origin === new URL(options.developmentUrl).origin
      } else {
        const normalizedTarget = new URL(targetUrl)
        normalizedTarget.hash = ''
        normalizedTarget.search = ''
        allowed = normalizedTarget.toString() === expectedProductionUrl
      }
    } catch {
      allowed = false
    }
    if (!allowed) event.preventDefault()
  })

  if (options.isDev) {
    void mainWindow.loadURL(options.developmentUrl)
    if (process.env.R05_UI_AUTOMATION !== '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  } else {
    void mainWindow.loadFile(options.productionIndexPath)
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', event => {
    if (options.getMinimizeToTray() && !options.isQuitting()) {
      event.preventDefault()
      mainWindow.hide()
      return
    }

    if (options.hasUnsavedChanges()) {
      const response = dialog.showMessageBoxSync(mainWindow, {
        type: 'warning',
        title: '仍有未保存内容',
        message: '部分待办或标签尚未成功写入磁盘。',
        detail: '建议返回应用重试保存。仍然退出会丢失本次未保存的修改。',
        buttons: ['返回并重试', '仍然退出'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      })
      if (response === 0) {
        event.preventDefault()
        options.setQuitting(false)
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  return mainWindow
}

interface WindowControlIpcDependencies {
  getMainWindow: () => BrowserWindow | null
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
}

export function registerWindowControlIpcHandlers(dependencies: WindowControlIpcDependencies) {
  const { getMainWindow, assertMainWindowSender } = dependencies

  ipcMain.handle('minimize-window', event => {
    assertMainWindowSender(event)
    getMainWindow()?.minimize()
    return true
  })

  ipcMain.handle('maximize-window', event => {
    assertMainWindowSender(event)
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
    return true
  })

  ipcMain.handle('close-window', event => {
    assertMainWindowSender(event)
    getMainWindow()?.close()
    return true
  })
}
