import { BrowserWindow, ipcMain, screen } from 'electron'
import { pathToFileURL } from 'url'
import type { IpcMainInvokeEvent, Rectangle } from 'electron'
import type { NotificationPosition } from './reminder-scheduler'

export interface NotificationWindowResult {
  success: boolean
  error?: string
}

interface NotificationWindowOptions {
  isDev: boolean
  preloadPath: string
  developmentUrl: string
  productionIndexPath: string
  getReferenceBounds: () => Rectangle | null
  logError: (message: string) => void
}

interface NotificationPayload {
  title: string
  body: string
  position?: NotificationPosition
}

interface NotificationIpcDependencies {
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
  showNotificationWindow: (payload: NotificationPayload) => Promise<NotificationWindowResult>
}

export function createNotificationWindow(options: NotificationWindowOptions) {
  return async function showNotificationWindow(payload: NotificationPayload): Promise<NotificationWindowResult> {
    let notificationWindow: BrowserWindow | null = null
    let autoCloseTimer: ReturnType<typeof setTimeout> | null = null
    try {
      const { title, body, position = 'bottom-right' } = payload
      const referenceBounds = options.getReferenceBounds()
      const display = referenceBounds ? screen.getDisplayMatching(referenceBounds) : screen.getPrimaryDisplay()
      const { x: areaX, y: areaY, width: screenWidth, height: screenHeight } = display.workArea
      const notifWidth = 320
      const notifHeight = 80
      const padding = 20
      let x: number
      let y: number

      switch (position) {
        case 'top-left':
          x = areaX + padding
          y = areaY + padding
          break
        case 'top-right':
          x = areaX + screenWidth - notifWidth - padding
          y = areaY + padding
          break
        case 'bottom-left':
          x = areaX + padding
          y = areaY + screenHeight - notifHeight - padding
          break
        case 'bottom-right':
        default:
          x = areaX + screenWidth - notifWidth - padding
          y = areaY + screenHeight - notifHeight - padding
          break
      }

      notificationWindow = new BrowserWindow({
        width: notifWidth,
        height: notifHeight,
        x,
        y,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        webPreferences: {
          preload: options.preloadPath,
          contextIsolation: true,
          nodeIntegration: false,
          additionalArguments: ['--notification-window']
        }
      })

      const expectedProductionUrl = pathToFileURL(options.productionIndexPath).toString()
      notificationWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
      notificationWindow.webContents.on('console-message', details => {
        if (details.level === 'warning' || details.level === 'error') {
          options.logError(
            `[通知窗口渲染器:${details.level}] ${details.message} (${details.sourceId}:${details.lineNumber})`
          )
        }
      })
      notificationWindow.webContents.on(
        'did-fail-load',
        (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
          if (isMainFrame) {
            options.logError(`[通知窗口加载失败] ${errorCode} ${errorDescription} ${validatedURL}`)
          }
        }
      )
      notificationWindow.webContents.on('will-navigate', (event, targetUrl) => {
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
        await notificationWindow.loadURL(options.developmentUrl)
      } else {
        await notificationWindow.loadFile(options.productionIndexPath, { hash: '/notification' })
      }

      notificationWindow.webContents.send('notification-data', { title, body })
      autoCloseTimer = setTimeout(() => {
        if (notificationWindow && !notificationWindow.isDestroyed()) {
          notificationWindow.close()
        }
      }, 5000)
      notificationWindow.on('closed', () => {
        if (autoCloseTimer) clearTimeout(autoCloseTimer)
      })
      return { success: true }
    } catch (error) {
      if (autoCloseTimer) clearTimeout(autoCloseTimer)
      if (notificationWindow && !notificationWindow.isDestroyed()) {
        notificationWindow.destroy()
      }
      const message = `显示通知失败：${error instanceof Error ? error.message : String(error)}`
      options.logError(message)
      return { success: false, error: message }
    }
  }
}

export function registerNotificationIpcHandler(dependencies: NotificationIpcDependencies) {
  ipcMain.handle('show-notification', async (event, options: unknown) => {
    dependencies.assertMainWindowSender(event)
    if (!options || typeof options !== 'object') {
      return { success: false, error: '通知参数无效' }
    }

    const payload = options as Partial<NotificationPayload>
    if (typeof payload.title !== 'string' || typeof payload.body !== 'string') {
      return { success: false, error: '通知参数无效' }
    }
    return dependencies.showNotificationWindow(payload as NotificationPayload)
  })
}
