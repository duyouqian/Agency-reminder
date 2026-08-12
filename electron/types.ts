export interface OperationResult<T = undefined> {
  success: boolean
  data?: T
  error?: string
  canceled?: boolean
}

export interface StorageSelectionResult {
  path: string
  mode: 'migrated' | 'use-target' | 'unchanged'
  reloadRequired: boolean
}

export interface Todo {
  id: string
  title: string
  completed: boolean
  color: string
  date: string
  tag?: string
  remindTime?: string
  repeat?: 'daily' | 'weekly' | 'monthly' | null
  priority?: 1 | 2 | 3
  createdAt: string
  generatedFromId?: string
  repeatAnchorDay?: number
}
