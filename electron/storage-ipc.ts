import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'

import type { OperationResult, StorageSelectionResult, Todo } from './types'

interface StorageIpcDependencies {
  assertMainWindowSender: (event: IpcMainInvokeEvent) => void
  getTodos: () => Todo[]
  getTodoPersistenceError: () => string | null
  saveTodos: (todos: unknown) => OperationResult
  selectStoragePath: () => Promise<OperationResult<StorageSelectionResult>>
  getStorageInfo: () => { dataPath: string; tagsPath: string }
  getTags: () => OperationResult<string[]>
  saveTags: (tags: unknown) => OperationResult
  log: (...args: unknown[]) => void
}

export function registerStorageIpcHandlers(dependencies: StorageIpcDependencies) {
  const {
    assertMainWindowSender,
    getTodos,
    getTodoPersistenceError,
    saveTodos,
    selectStoragePath,
    getStorageInfo,
    getTags,
    saveTags,
    log
  } = dependencies

  ipcMain.handle('get-all-todos', event => {
    assertMainWindowSender(event)
    const todos = getTodos()
    log('get-all-todos, 数量:', todos.length)
    return {
      success: !getTodoPersistenceError(),
      data: [...todos],
      error: getTodoPersistenceError() || undefined
    }
  })

  ipcMain.handle('save-todos', (event, todos) => {
    assertMainWindowSender(event)
    return saveTodos(todos)
  })

  ipcMain.handle('select-storage-path', async event => {
    assertMainWindowSender(event)
    return selectStoragePath()
  })

  ipcMain.handle('get-storage-info', event => {
    assertMainWindowSender(event)
    return getStorageInfo()
  })

  ipcMain.handle('get-tags', event => {
    assertMainWindowSender(event)
    const result = getTags()
    log('获取标签，数量:', result.data?.length || 0)
    return result
  })

  ipcMain.handle('save-tags', (event, tags) => {
    assertMainWindowSender(event)
    return saveTags(tags)
  })
}
