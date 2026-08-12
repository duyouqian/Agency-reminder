import { dirname } from 'path'
import * as fs from 'fs'

export interface JsonReadResult<T> {
  success: boolean
  data: T
  error?: string
  recoveredFrom?: string
}

export interface FileSnapshot {
  path: string
  content: Buffer | null
}

interface JsonFileStorageOptions {
  backupCount: number
  logError: (...args: unknown[]) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function createJsonFileStorage(options: JsonFileStorageOptions) {
  function getBackupPath(filePath: string, index: number): string {
    return `${filePath}.bak${index}`
  }

  function rotateBackups(filePath: string, previousContent: Buffer) {
    for (let index = options.backupCount; index >= 2; index--) {
      const previousPath = getBackupPath(filePath, index - 1)
      if (fs.existsSync(previousPath)) {
        fs.copyFileSync(previousPath, getBackupPath(filePath, index))
      }
    }
    fs.writeFileSync(getBackupPath(filePath, 1), previousContent)
  }

  function replaceFileAtomically(filePath: string, content: string | Buffer, createBackup: boolean, validateJson: boolean) {
    const parentDir = dirname(filePath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    let fileDescriptor: number | null = null
    const previousContent = createBackup && fs.existsSync(filePath) ? fs.readFileSync(filePath) : null
    try {
      fileDescriptor = fs.openSync(tempPath, 'wx')
      fs.writeFileSync(fileDescriptor, content)
      fs.fsyncSync(fileDescriptor)
      fs.closeSync(fileDescriptor)
      fileDescriptor = null

      if (validateJson) {
        JSON.parse(fs.readFileSync(tempPath, 'utf-8'))
      }
      fs.renameSync(tempPath, filePath)
      if (previousContent) {
        try {
          rotateBackups(filePath, previousContent)
        } catch (backupError) {
          options.logError('主文件已写入，但备份轮转失败:', backupError)
        }
      }
    } catch (error) {
      if (fileDescriptor !== null) {
        try {
          fs.closeSync(fileDescriptor)
        } catch {
          // 文件描述符清理失败不覆盖原始错误
        }
      }
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath)
        } catch {
          // 临时文件清理失败不覆盖原始错误
        }
      }
      throw error
    }
  }

  function writeJsonAtomically(filePath: string, value: unknown, createBackup = true) {
    replaceFileAtomically(filePath, JSON.stringify(value, null, 2), createBackup, true)
  }

  function writeFileAtomically(filePath: string, content: Buffer, createBackup = true) {
    replaceFileAtomically(filePath, content, createBackup, false)
  }

  function preserveCorruptedFile(filePath: string): string | null {
    if (!fs.existsSync(filePath)) return null
    const preservedPath = `${filePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`
    try {
      fs.copyFileSync(filePath, preservedPath)
      return preservedPath
    } catch (error) {
      options.logError('保留损坏文件失败:', error)
      return null
    }
  }

  function readJsonWithBackups<T>(
    filePath: string,
    validate: (value: unknown) => T,
    serialize: (value: T) => unknown,
    missingValue: T
  ): JsonReadResult<T> {
    if (!fs.existsSync(filePath)) {
      return { success: true, data: missingValue }
    }

    try {
      return { success: true, data: validate(JSON.parse(fs.readFileSync(filePath, 'utf-8'))) }
    } catch (primaryError) {
      const preservedPath = preserveCorruptedFile(filePath)
      for (let index = 1; index <= options.backupCount; index++) {
        const backupPath = getBackupPath(filePath, index)
        if (!fs.existsSync(backupPath)) continue
        try {
          const recoveredData = validate(JSON.parse(fs.readFileSync(backupPath, 'utf-8')))
          writeJsonAtomically(filePath, serialize(recoveredData), false)
          return { success: true, data: recoveredData, recoveredFrom: backupPath }
        } catch (backupError) {
          options.logError(`备份 ${backupPath} 无法恢复:`, backupError)
        }
      }

      const preserveMessage = preservedPath ? `，损坏原件已保留为 ${preservedPath}` : ''
      return {
        success: false,
        data: missingValue,
        error: `数据文件损坏且没有可用备份${preserveMessage}。为防止覆盖，已暂停自动保存。原始错误：${getErrorMessage(primaryError)}`
      }
    }
  }

  function captureFileSnapshot(filePath: string): FileSnapshot {
    return {
      path: filePath,
      content: fs.existsSync(filePath) ? fs.readFileSync(filePath) : null
    }
  }

  function restoreFileSnapshot(snapshot: FileSnapshot) {
    if (snapshot.content === null) {
      if (fs.existsSync(snapshot.path)) {
        fs.unlinkSync(snapshot.path)
      }
      return
    }
    replaceFileAtomically(snapshot.path, snapshot.content, false, false)
  }

  return { writeJsonAtomically, writeFileAtomically, readJsonWithBackups, captureFileSnapshot, restoreFileSnapshot }
}
