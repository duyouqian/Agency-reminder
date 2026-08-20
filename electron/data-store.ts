import { dirname, join } from 'path'
import * as fs from 'fs'

import { createJsonFileStorage, type JsonReadResult } from './json-file-storage'
import type { OperationResult, StorageSelectionResult, Todo } from './types'

interface DataStoreSettings {
  get: (key: string) => unknown
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
}

type TargetConflictChoice = 'cancel' | 'use-target' | 'overwrite'

interface DataStoreDependencies {
  getUserDataPath: () => string
  store: DataStoreSettings
  chooseTargetConflict: () => Promise<TargetConflictChoice>
  confirmUseTarget: () => Promise<boolean>
  confirmProtectedMigration: (reason: string) => Promise<boolean>
  log: (...args: unknown[]) => void
  logError: (...args: unknown[]) => void
}

const BACKUP_COUNT = 1
const DEFAULT_TAGS = ['需求', 'Bug', '临时活']

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export function validateTodos(value: unknown): Todo[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { todos?: unknown }).todos)) {
    throw new Error('待办数据文件缺少 todos 数组')
  }

  const todos = (value as { todos: unknown[] }).todos
  return todos.map((todo, index) => {
    if (!todo || typeof todo !== 'object' || Array.isArray(todo)) {
      throw new Error(`第 ${index + 1} 条待办必须是对象`)
    }

    const item = todo as Record<string, unknown>
    const errors: string[] = []
    if (typeof item.id !== 'string' || !item.id.trim()) errors.push('id 必须是非空字符串')
    if (typeof item.title !== 'string' || !item.title.trim()) errors.push('title 必须是非空字符串')
    if (typeof item.completed !== 'boolean') errors.push('completed 必须是布尔值')
    if (typeof item.color !== 'string' || !item.color.trim()) errors.push('color 必须是非空字符串')
    if (!isValidDateString(item.date)) errors.push('date 必须是有效的 YYYY-MM-DD 日期')
    if (typeof item.createdAt !== 'string' || !item.createdAt.trim() || Number.isNaN(Date.parse(item.createdAt))) {
      errors.push('createdAt 必须是有效时间')
    }
    if (item.tag !== undefined && typeof item.tag !== 'string') errors.push('tag 必须是字符串')
    if (item.remindTime !== undefined
      && (typeof item.remindTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.remindTime))) {
      errors.push('remindTime 必须是有效的 HH:mm 时间')
    }
    if (item.repeat !== undefined && item.repeat !== null && !['daily', 'weekly', 'monthly'].includes(String(item.repeat))) {
      errors.push('repeat 必须是 daily、weekly、monthly 或 null')
    }
    if (item.priority !== undefined && ![1, 2, 3].includes(item.priority as number)) {
      errors.push('priority 必须是 1、2 或 3')
    }
    if (item.generatedFromId !== undefined
      && (typeof item.generatedFromId !== 'string' || !item.generatedFromId.trim())) {
      errors.push('generatedFromId 必须是非空字符串')
    }
    if (item.repeatAnchorDay !== undefined
      && (!Number.isInteger(item.repeatAnchorDay) || (item.repeatAnchorDay as number) < 1 || (item.repeatAnchorDay as number) > 31)) {
      errors.push('repeatAnchorDay 必须是 1 到 31 的整数')
    }
    if (item.repeatAnchorDay !== undefined && item.repeat !== 'monthly') {
      errors.push('repeatAnchorDay 只允许用于 monthly 重复任务')
    }
    if (errors.length > 0) {
      throw new Error(`第 ${index + 1} 条待办格式错误：${errors.join('；')}`)
    }

    return { ...item } as unknown as Todo
  })
}

export function validateTags(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(tag => typeof tag !== 'string')) {
    throw new Error('标签数据必须是字符串数组')
  }
  return [...value]
}

export function createDataStore(dependencies: DataStoreDependencies) {
  const jsonFileStorage = createJsonFileStorage({ backupCount: BACKUP_COUNT, logError: dependencies.logError })
  let dataFilePath = ''
  let todosData: Todo[] = []
  let tagsData: string[] | null = null
  let todoWritesBlockedReason: string | null = null
  let tagWritesBlockedReason: string | null = null
  let hasUnsavedTodos = false
  let hasUnsavedTags = false

  function getTagsFilePath(): string {
    return dataFilePath
      ? join(dirname(dataFilePath), 'remind-tags.json')
      : join(dependencies.getUserDataPath(), 'remind-tags.json')
  }

  function getBgImagePath(): string {
    return dataFilePath
      ? join(dirname(dataFilePath), 'remind-bg')
      : join(dependencies.getUserDataPath(), 'remind-bg')
  }

  function loadData() {
    const result = jsonFileStorage.readJsonWithBackups(dataFilePath, validateTodos, todos => ({ todos }), [])
    todosData = result.data
    todoWritesBlockedReason = result.success ? null : result.error || '待办数据无法安全加载'
    hasUnsavedTodos = false
    if (result.recoveredFrom) {
      dependencies.log('已从备份恢复待办数据:', result.recoveredFrom)
    } else if (!result.success) {
      dependencies.logError(result.error)
    } else {
      dependencies.log('加载待办数据，数量:', todosData.length)
    }
  }

  function initialize(customPath?: string) {
    if (customPath) {
      dependencies.log('使用自定义存储路径:', customPath)
      if (!fs.existsSync(customPath)) {
        fs.mkdirSync(customPath, { recursive: true })
        dependencies.log('创建目录:', customPath)
      }
      dataFilePath = join(customPath, 'remind-data.json')
    } else {
      dependencies.log('使用默认存储路径')
      dataFilePath = join(dependencies.getUserDataPath(), 'remind-data.json')
    }

    dependencies.log('数据文件路径:', dataFilePath)
    loadData()
    tagsData = null
    tagWritesBlockedReason = null
  }

  function saveData(targetPath = dataFilePath, allowBlockedWrite = false): OperationResult {
    try {
      dependencies.log('saveData 执行, 待办数量:', todosData.length)
      if (!targetPath) {
        return { success: false, error: '数据文件路径未初始化' }
      }
      if (!allowBlockedWrite && targetPath === dataFilePath && todoWritesBlockedReason) {
        return { success: false, error: todoWritesBlockedReason }
      }
      validateTodos({ todos: todosData })
      jsonFileStorage.writeJsonAtomically(targetPath, { todos: todosData })
      return { success: true }
    } catch (error) {
      const message = `保存待办失败：${getErrorMessage(error)}`
      dependencies.logError(message)
      return { success: false, error: message }
    }
  }

  function loadTagsFromPath(tagsPath: string): JsonReadResult<string[]> {
    return jsonFileStorage.readJsonWithBackups(tagsPath, validateTags, tags => tags, [...DEFAULT_TAGS])
  }

  function ensureTagsLoaded(): OperationResult<string[]> {
    if (tagsData !== null) {
      return tagWritesBlockedReason
        ? { success: false, data: [...tagsData], error: tagWritesBlockedReason }
        : { success: true, data: [...tagsData] }
    }

    const result = loadTagsFromPath(getTagsFilePath())
    tagsData = result.data
    tagWritesBlockedReason = result.success ? null : result.error || '标签数据无法安全加载'
    if (result.recoveredFrom) {
      dependencies.log('已从备份恢复标签数据:', result.recoveredFrom)
    } else if (!result.success) {
      dependencies.logError(result.error)
    }
    return result.success
      ? { success: true, data: [...result.data] }
      : { success: false, data: [...result.data], error: result.error }
  }

  function saveTagsData(targetPath = getTagsFilePath(), allowBlockedWrite = false): OperationResult {
    try {
      if (tagsData === null) tagsData = [...DEFAULT_TAGS]
      if (!allowBlockedWrite && targetPath === getTagsFilePath() && tagWritesBlockedReason) {
        return { success: false, error: tagWritesBlockedReason }
      }
      validateTags(tagsData)
      jsonFileStorage.writeJsonAtomically(targetPath, tagsData)
      return { success: true }
    } catch (error) {
      const message = `保存标签失败：${getErrorMessage(error)}`
      dependencies.logError(message)
      return { success: false, error: message }
    }
  }

  function getTodos(): Todo[] {
    return todosData
  }

  function getTodoPersistenceError(): string | null {
    return todoWritesBlockedReason
  }

  function hasUnsavedChanges(): boolean {
    return hasUnsavedTodos || hasUnsavedTags
  }

  function saveTodos(todos: unknown): OperationResult {
    try {
      const validatedTodos = validateTodos({ todos })
      todosData = validatedTodos.map(todo => ({ ...todo }))
    } catch (error) {
      hasUnsavedTodos = true
      return { success: false, error: `拒绝保存非法待办：${getErrorMessage(error)}` }
    }

    if (!dataFilePath) {
      hasUnsavedTodos = true
      return { success: false, error: '数据文件路径未初始化' }
    }

    const result = saveData()
    hasUnsavedTodos = !result.success
    if (result.success) todoWritesBlockedReason = null
    return result
  }

  function getTags(): OperationResult<string[]> {
    return ensureTagsLoaded()
  }

  function saveTags(tags: unknown): OperationResult {
    try {
      tagsData = validateTags(tags)
      dependencies.log('保存标签，数量:', tagsData.length)
      const result = saveTagsData()
      hasUnsavedTags = !result.success
      if (result.success) tagWritesBlockedReason = null
      return result
    } catch (error) {
      hasUnsavedTags = true
      const message = `拒绝保存非法标签：${getErrorMessage(error)}`
      dependencies.logError(message)
      return { success: false, error: message }
    }
  }

  function getStorageInfo() {
    return { dataPath: dataFilePath, tagsPath: getTagsFilePath() }
  }

  async function migrateStorage(customPath: string): Promise<OperationResult<StorageSelectionResult>> {
    const oldDataPath = dataFilePath
    const oldTagsPath = getTagsFilePath()
    const oldBgPath = getBgImagePath()
    const previousStoragePath = dependencies.store.get('storagePath') as string | undefined
    const newDataPath = join(customPath, 'remind-data.json')
    const newTagsPath = join(customPath, 'remind-tags.json')
    const newBgPath = join(customPath, 'remind-bg')

    function restoreStoragePath() {
      if (previousStoragePath === undefined) dependencies.store.delete('storagePath')
      else dependencies.store.set('storagePath', previousStoragePath)
    }

    if (newDataPath === oldDataPath) {
      return { success: true, data: { path: customPath, mode: 'unchanged', reloadRequired: false } }
    }

    let migrationMode: 'migrated' | 'use-target' = 'migrated'
    const targetHasData = fs.existsSync(newDataPath) || fs.existsSync(newTagsPath) || fs.existsSync(newBgPath)
    if (targetHasData) {
      const choice = await dependencies.chooseTargetConflict()
      if (choice === 'cancel') return { success: false, canceled: true }
      migrationMode = choice === 'use-target' ? 'use-target' : 'migrated'
    }

    if (migrationMode === 'use-target') {
      if (!await dependencies.confirmUseTarget()) return { success: false, canceled: true }

      const targetTodosResult = jsonFileStorage.readJsonWithBackups(newDataPath, validateTodos, todos => ({ todos }), [])
      const targetTagsResult = loadTagsFromPath(newTagsPath)
      if (!targetTodosResult.success || !targetTagsResult.success) {
        return { success: false, error: targetTodosResult.error || targetTagsResult.error || '目标目录数据无法安全加载' }
      }

      try {
        dependencies.store.set('storagePath', customPath)
        dataFilePath = newDataPath
        todosData = targetTodosResult.data
        tagsData = targetTagsResult.data
        todoWritesBlockedReason = null
        tagWritesBlockedReason = null
        hasUnsavedTodos = false
        hasUnsavedTags = false
        return { success: true, data: { path: customPath, mode: 'use-target', reloadRequired: true } }
      } catch (error) {
        try {
          restoreStoragePath()
        } catch (rollbackError) {
          dependencies.logError('恢复原存储路径失败:', rollbackError)
        }
        return { success: false, error: `保存新存储路径失败：${getErrorMessage(error)}` }
      }
    }

    const currentTagsResult = ensureTagsLoaded()
    const protectionReason = todoWritesBlockedReason || tagWritesBlockedReason || currentTagsResult.error
    if (protectionReason && !await dependencies.confirmProtectedMigration(protectionReason)) {
      return { success: false, canceled: true }
    }

    let targetSnapshots: ReturnType<typeof jsonFileStorage.captureFileSnapshot>[]
    try {
      targetSnapshots = [
        jsonFileStorage.captureFileSnapshot(newDataPath),
        jsonFileStorage.captureFileSnapshot(newTagsPath),
        jsonFileStorage.captureFileSnapshot(newBgPath)
      ]
    } catch (error) {
      return { success: false, error: `无法读取目标目录现有文件：${getErrorMessage(error)}` }
    }

    let dataWritten = false
    let tagsWritten = false
    let backgroundWritten = false
    try {
      jsonFileStorage.writeJsonAtomically(newDataPath, { todos: todosData })
      dataWritten = true
      jsonFileStorage.writeJsonAtomically(newTagsPath, tagsData || DEFAULT_TAGS)
      tagsWritten = true
      if (fs.existsSync(oldBgPath)) {
        jsonFileStorage.writeFileAtomically(newBgPath, fs.readFileSync(oldBgPath))
        backgroundWritten = true
      } else if (fs.existsSync(newBgPath)) {
        fs.unlinkSync(newBgPath)
        backgroundWritten = true
      }
      dependencies.store.set('storagePath', customPath)
    } catch (error) {
      try {
        restoreStoragePath()
      } catch (rollbackError) {
        dependencies.logError('恢复原存储路径失败:', rollbackError)
      }
      const snapshotsToRestore = targetSnapshots.filter((_, index) => {
        if (index === 0) return dataWritten
        if (index === 1) return tagsWritten
        return backgroundWritten
      })
      const rollbackErrors: string[] = []
      for (const snapshot of snapshotsToRestore) {
        try {
          jsonFileStorage.restoreFileSnapshot(snapshot)
        } catch (rollbackError) {
          dependencies.logError('回滚目标文件失败:', rollbackError)
          rollbackErrors.push(`${snapshot.path}: ${getErrorMessage(rollbackError)}`)
        }
      }
      if (rollbackErrors.length > 0) {
        return {
          success: false,
          error: `迁移失败，且部分目标文件回滚失败：${getErrorMessage(error)}；${rollbackErrors.join('；')}`
        }
      }
      return { success: false, error: `迁移失败，已恢复目标目录原状态：${getErrorMessage(error)}` }
    }

    dataFilePath = newDataPath
    todoWritesBlockedReason = null
    tagWritesBlockedReason = null
    hasUnsavedTodos = false
    hasUnsavedTags = false
    dependencies.log('数据、标签和背景已迁移到:', customPath, '原路径:', oldDataPath, oldTagsPath, oldBgPath)
    return { success: true, data: { path: customPath, mode: 'migrated', reloadRequired: true } }
  }

  return {
    initialize,
    getTodos,
    getTodoPersistenceError,
    hasUnsavedChanges,
    saveTodos,
    getTags,
    saveTags,
    getStorageInfo,
    getBgImagePath,
    migrateStorage,
    writeFileAtomically: jsonFileStorage.writeFileAtomically
  }
}
