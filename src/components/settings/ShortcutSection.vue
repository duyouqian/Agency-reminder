<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import type { OperationResult } from '../../../electron/ipc-types'
import SettingsSection from './SettingsSection.vue'

const settingsStore = useSettingsStore()

const emit = defineEmits<{
  toast: [payload: { message: string; type: 'success' | 'error' | 'info' }]
}>()

const recording = ref<string | null>(null)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true)
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, true)
  window.removeEventListener('click', handleClickOutside)
})

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.shortcut-key-box') && !target.closest('.btn-modify')) {
    recording.value = null
  }
}

function startRecording(type: string) {
  recording.value = type
}

async function handleKeyDown(e: KeyboardEvent) {
  if (!recording.value) return

  e.preventDefault()
  e.stopPropagation()

  // Build the shortcut string
  const keys: string[] = []

  // Add modifier keys in standard order
  if (e.ctrlKey) keys.push('Ctrl')
  if (e.altKey) keys.push('Alt')
  if (e.shiftKey) keys.push('Shift')
  if (e.metaKey) keys.push('Cmd')

  // Add the main key (skip if it's only a modifier)
  const modifierKeys = ['Control', 'Alt', 'Shift', 'Meta', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight']
  if (modifierKeys.includes(e.code) || modifierKeys.includes(e.key)) {
    // Just a modifier key, don't complete yet
    return
  }

  // Map special keys to readable names
  const keyMap: Record<string, string> = {
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'Enter': 'Enter',
    'Escape': 'Esc',
    'Tab': 'Tab',
    'Space': 'Space',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'Insert': 'Insert',
  }

  let keyName = keyMap[e.key] || keyMap[e.code]
  if (!keyName) {
    // Use the key itself, uppercase for letters
    keyName = e.key.length === 1 ? e.key.toUpperCase() : e.key
  }

  keys.push(keyName)

  // Must have at least one modifier + main key
  if (keys.length >= 2) {
    const shortcut = keys.join('+')
    let result: OperationResult
    try {
      result = recording.value === 'quickAdd'
        ? await settingsStore.setQuickAddKey(shortcut)
        : await settingsStore.setToggleMainKey(shortcut)
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error.message : '快捷键保存失败'
      }
    }
    if (!result.success) {
      emit('toast', { message: result.error || '快捷键注册失败，已保留旧快捷键', type: 'error' })
    }
    recording.value = null
  }
}
</script>

<template>
  <SettingsSection icon="⌨️" title="快捷键">
    <div class="shortcut-card">
      <div class="shortcut-item">
        <div class="shortcut-desc-text">快速添加待办</div>
        <div class="shortcut-action">
          <div class="shortcut-key-box" :class="{ recording: recording === 'quickAdd' }" @click="startRecording('quickAdd')">
            <span v-if="recording === 'quickAdd'" class="recording-text">请按键...</span>
            <template v-else>
              <kbd v-for="(key, i) in settingsStore.quickAddKeyDisplay.split('+')" :key="i">{{ key.trim() }}</kbd>
            </template>
          </div>
          <button class="btn-modify" @click="startRecording('quickAdd')" :disabled="recording === 'quickAdd'">修改</button>
        </div>
      </div>

      <div class="shortcut-item">
        <div class="shortcut-desc-text">显示/隐藏主窗口</div>
        <div class="shortcut-action">
          <div class="shortcut-key-box" :class="{ recording: recording === 'toggleMain' }" @click="startRecording('toggleMain')">
            <span v-if="recording === 'toggleMain'" class="recording-text">请按键...</span>
            <template v-else>
              <kbd v-for="(key, i) in settingsStore.toggleMainKeyDisplay.split('+')" :key="i">{{ key.trim() }}</kbd>
            </template>
          </div>
          <button class="btn-modify" @click="startRecording('toggleMain')" :disabled="recording === 'toggleMain'">修改</button>
        </div>
      </div>
    </div>
    <div v-if="recording" class="recording-tip">
      按下快捷键组合，点击其他区域取消
    </div>
  </SettingsSection>
</template>

<style scoped>
.shortcut-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-desc-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.shortcut-action {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shortcut-key-box {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  justify-content: center;
}

.shortcut-key-box:hover {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.08);
}

.shortcut-key-box.recording {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.12);
  animation: pulse 1s infinite;
}

.shortcut-key-box kbd {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  background: var(--bg-color);
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.recording-text {
  font-size: 12px;
  color: var(--primary-color);
  font-weight: 500;
}

.btn-modify {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-modify:hover:not(:disabled) {
  color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-modify:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recording-tip {
  margin-top: 10px;
  padding: 10px 14px;
  background: rgba(74, 144, 226, 0.1);
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--primary-color);
  text-align: center;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
