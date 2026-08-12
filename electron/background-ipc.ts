import { ipcMain } from 'electron'
import * as fs from 'fs'
import type { IpcMainInvokeEvent } from 'electron'
import type { OperationResult } from './types'

interface BackgroundStore {
  set: (key: string, value: unknown) => void
}

interface BackgroundIpcDependencies {
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
  getBgImagePath: () => string
  writeFileAtomically: (filePath: string, content: Buffer) => void
  store: BackgroundStore
  log: (...args: unknown[]) => void
  logError: (...args: unknown[]) => void
  getErrorMessage: (error: unknown) => string
}

export function registerBackgroundIpcHandlers(dependencies: BackgroundIpcDependencies) {
  const {
    assertMainWindowSender,
    getBgImagePath,
    writeFileAtomically,
    store,
    log,
    logError,
    getErrorMessage
  } = dependencies

  ipcMain.handle('save-bg-image', async (event, imageData: unknown) => {
    assertMainWindowSender(event)
    if (typeof imageData !== 'string') {
      return null
    }
    try {
      const match = /^data:(image\/(?:png|jpeg|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(imageData)
      if (!match) {
        logError('拒绝不支持或格式无效的背景图片')
        return null
      }

      // 校验 base64 数据大小（10MB 上限）
      const mimeType = match[1]
      const base64Data = match[2]
      const buffer = Buffer.from(base64Data, 'base64')
      const sizeInBytes = buffer.length
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (sizeInBytes === 0 || sizeInBytes > maxSize) {
        logError('背景图片过大:', (sizeInBytes / 1024 / 1024).toFixed(1), 'MB，上限 10MB')
        return null
      }

      const isPng = buffer.length >= 8
        && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
      const isJpeg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
      const gifHeader = buffer.subarray(0, 6).toString('ascii')
      const isGif = gifHeader === 'GIF87a' || gifHeader === 'GIF89a'
      const signatureMatches = (mimeType === 'image/png' && isPng)
        || (mimeType === 'image/jpeg' && isJpeg)
        || (mimeType === 'image/gif' && isGif)
      if (!signatureMatches) {
        logError('背景图片声明类型与文件内容不一致')
        return null
      }

      const bgPath = getBgImagePath()
      log('保存背景图片')
      writeFileAtomically(bgPath, buffer)
      // 清理旧版本可能遗留的 Base64 配置，背景数据只保留磁盘副本
      store.set('customBgImage', '')
      return bgPath
    } catch (error) {
      logError('保存背景图片失败:', error)
      return null
    }
  })

  ipcMain.handle('get-bg-image', async event => {
    assertMainWindowSender(event)
    try {
      const bgPath = getBgImagePath()
      if (fs.existsSync(bgPath)) {
        const buffer = fs.readFileSync(bgPath)
        const base64 = buffer.toString('base64')
        let mimeType: string | null = null
        if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
          mimeType = 'image/png'
        } else if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
          mimeType = 'image/jpeg'
        } else if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) {
          mimeType = 'image/gif'
        }
        if (!mimeType) {
          logError('背景图片格式无法识别:', bgPath)
          return null
        }
        return `data:${mimeType};base64,${base64}`
      }
      return null
    } catch (error) {
      logError('读取背景图片失败:', error)
      return null
    }
  })

  ipcMain.handle('delete-bg-image', async (event): Promise<OperationResult> => {
    assertMainWindowSender(event)
    try {
      const bgPath = getBgImagePath()
      if (fs.existsSync(bgPath)) {
        fs.unlinkSync(bgPath)
      }
      store.set('customBgImage', '')
      return { success: true }
    } catch (error) {
      const message = `删除背景图片失败：${getErrorMessage(error)}`
      logError(message)
      return { success: false, error: message }
    }
  })
}
