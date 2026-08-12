import { ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { OperationResult } from './types'

interface ExternalLinkIpcDependencies {
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
  allowedOrigins: ReadonlySet<string>
  logError: (...args: unknown[]) => void
  getErrorMessage: (error: unknown) => string
}

export function registerExternalLinkIpcHandler(dependencies: ExternalLinkIpcDependencies) {
  const {
    assertMainWindowSender,
    allowedOrigins,
    logError,
    getErrorMessage
  } = dependencies

  ipcMain.handle('open-external', async (event, url: unknown): Promise<OperationResult> => {
    assertMainWindowSender(event)
    if (typeof url !== 'string') {
      return { success: false, error: '外部链接格式无效' }
    }
    try {
      const parsedUrl = new URL(url)
      if (!allowedOrigins.has(parsedUrl.origin)) {
        logError('拒绝打开未列入白名单的外部链接:', url)
        return { success: false, error: '外部链接未列入白名单' }
      }
      await shell.openExternal(parsedUrl.toString())
      return { success: true }
    } catch (error) {
      return { success: false, error: `外部链接格式无效：${getErrorMessage(error)}` }
    }
  })
}
