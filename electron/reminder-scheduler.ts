import { powerMonitor } from 'electron'
import { getLocalDateString } from './utils'
import type { Todo } from './types'
import { appBranding } from '../src/config/branding'

export type NotificationPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'

interface ReminderNotificationResult {
  success: boolean
}

interface ReminderSchedulerDependencies {
  getTodos: () => Todo[]
  getNotificationPosition: () => NotificationPosition | undefined
  showNotification: (options: { title: string; body: string; position: NotificationPosition }) => Promise<ReminderNotificationResult>
  getRemindedIds: () => unknown
  saveRemindedIds: (keys: string[]) => void
  onError: (error: unknown) => void
}

export function createReminderScheduler(dependencies: ReminderSchedulerDependencies) {
  let reminderInterval: ReturnType<typeof setInterval> | null = null
  let reminderCheckRunning = false

  async function checkReminders() {
    if (reminderCheckRunning) return
    reminderCheckRunning = true
    try {
      const now = new Date()
      const today = getLocalDateString(now)
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const savedValue = dependencies.getRemindedIds()
      const savedKeys = Array.isArray(savedValue)
        ? savedValue.filter((value): value is string => typeof value === 'string')
        : []
      const todos = dependencies.getTodos()
      const currentReminderKeys = new Set(
        todos
          .filter(todo => !todo.completed && todo.date === today && typeof todo.remindTime === 'string')
          .map(todo => `${todo.id}-${todo.date}-${todo.remindTime}`)
      )
      const remindedKeys = new Set(savedKeys.filter(key => currentReminderKeys.has(key)))
      let changed = remindedKeys.size !== savedKeys.length
      const configuredPosition = dependencies.getNotificationPosition() || 'bottom-right'

      for (const todo of todos) {
        if (todo.completed || todo.date !== today || typeof todo.remindTime !== 'string') continue
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(todo.remindTime) || todo.remindTime > currentTime) continue

        const remindKey = `${todo.id}-${todo.date}-${todo.remindTime}`
        if (remindedKeys.has(remindKey)) continue
        const result = await dependencies.showNotification({
          title: appBranding.notificationTitle,
          body: todo.title,
          position: configuredPosition
        })
        if (result.success) {
          remindedKeys.add(remindKey)
          changed = true
        }
      }

      if (changed) {
        dependencies.saveRemindedIds([...remindedKeys])
      }
    } catch (error) {
      dependencies.onError(error)
    } finally {
      reminderCheckRunning = false
    }
  }

  function start() {
    if (reminderInterval) return
    reminderInterval = setInterval(() => {
      void checkReminders()
    }, 30000)
    powerMonitor.on('resume', checkReminders)
    void checkReminders()
  }

  function stop() {
    if (reminderInterval) {
      clearInterval(reminderInterval)
      reminderInterval = null
    }
    powerMonitor.removeListener('resume', checkReminders)
  }

  return { checkReminders, start, stop }
}
