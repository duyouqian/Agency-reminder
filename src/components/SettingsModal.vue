<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore, type NotificationPosition } from '../stores/settings'
import Toast from './Toast.vue'

const settingsStore = useSettingsStore()

// Toast 状态
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')

// 通知位置选项
const positionOptions: { value: NotificationPosition; label: string }[] = [
  { value: 'top-left', label: '左上角' },
  { value: 'top-right', label: '右上角' },
  { value: 'bottom-left', label: '左下角' },
  { value: 'bottom-right', label: '右下角' }
]

const storagePath = ref('')
const recording = ref<string | null>(null)

const emit = defineEmits<{
  close: []
}>()

const actualDataPath = ref('')
const actualTagsPath = ref('')

onMounted(async () => {
  try {
    storagePath.value = await window.electronAPI.getConfig('storagePath') || ''
    
    // 获取实际的数据文件路径
    const storageInfo = await window.electronAPI.getStorageInfo?.()
    if (storageInfo) {
      actualDataPath.value = storageInfo.dataPath
      actualTagsPath.value = storageInfo.tagsPath
    }
  } catch (error) {
    toastMessage.value = error instanceof Error ? error.message : '设置数据加载失败'
    toastType.value = 'error'
    showToast.value = true
  }
  
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

async function applySettingChange(action: () => Promise<OperationResult>) {
  const result = await action()
  if (!result.success) {
    toastMessage.value = result.error || '设置保存失败'
    toastType.value = 'error'
    showToast.value = true
  }
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
      toastMessage.value = result.error || '快捷键注册失败，已保留旧快捷键'
      toastType.value = 'error'
      showToast.value = true
    }
    recording.value = null
  }
}

async function handleSelectStorage() {
  try {
    const result = await window.electronAPI.selectStoragePath()
    if (result.success && result.data) {
      storagePath.value = result.data.path
      // 刷新实际数据路径显示
      const storageInfo = await window.electronAPI.getStorageInfo()
      if (storageInfo) {
        actualDataPath.value = storageInfo.dataPath
        actualTagsPath.value = storageInfo.tagsPath
      }
      toastMessage.value = result.data.mode === 'unchanged' ? '当前已经使用该目录' : '数据已迁移到新目录'
      toastType.value = 'success'
      showToast.value = true
      if (result.data.reloadRequired) {
        setTimeout(() => window.location.reload(), 300)
      }
    } else if (!result.canceled) {
      toastMessage.value = result.error || '数据迁移失败'
      toastType.value = 'error'
      showToast.value = true
    }
  } catch (err) {
    // 选择目录失败
    toastMessage.value = '选择目录失败'
    toastType.value = 'error'
    showToast.value = true
  }
}

/*
// AI 周报功能暂未完善，注释保留
async function handleApiKeySubmit() {
  const apiKey = (document.getElementById('apiKey') as HTMLInputElement)?.value
  if (apiKey) {
    await window.electronAPI.setStore('openaiApiKey', apiKey)
    toastMessage.value = 'API密钥已保存'
    toastType.value = 'success'
    showToast.value = true
  }
}
*/
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal settings-modal">
      <div class="modal-header">
        <div class="modal-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          设置
        </div>
        <button class="close-btn" @click="emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="settings-content">
        <div v-if="settingsStore.persistenceError" class="settings-error" role="alert">
          {{ settingsStore.persistenceError }}
        </div>

        <!-- 外观 -->
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">🎨</div>
            <div class="section-title">外观</div>
          </div>
          <div class="section-body">
            <div class="setting-card">
              <div class="setting-info">
                <span class="setting-label">深色模式</span>
                <span class="setting-desc">切换深色/浅色主题</span>
              </div>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="settingsStore.darkMode"
                  @change="(e) => applySettingChange(() => settingsStore.setDarkMode((e.target as HTMLInputElement).checked))"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- 窗口 -->
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">🪟</div>
            <div class="section-title">窗口</div>
          </div>
          <div class="section-body">
            <div class="setting-card">
              <div class="setting-info">
                <span class="setting-label">窗口置顶</span>
                <span class="setting-desc">主窗口始终显示在最前面</span>
              </div>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="settingsStore.alwaysOnTop"
                  @change="(e) => applySettingChange(() => settingsStore.setAlwaysOnTop((e.target as HTMLInputElement).checked))"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div class="setting-card">
              <div class="setting-info">
                <span class="setting-label">关闭时最小化到托盘</span>
                <span class="setting-desc">关闭窗口时保持在后台运行</span>
              </div>
              <label class="toggle">
                <input 
                  type="checkbox" 
                  :checked="settingsStore.minimizeToTray"
                  @change="(e) => applySettingChange(() => settingsStore.setMinimizeToTray((e.target as HTMLInputElement).checked))"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <!-- 系统 -->
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">⚙️</div>
            <div class="section-title">系统</div>
          </div>
          <div class="section-body">
            <div class="setting-card">
              <div class="setting-info">
                <span class="setting-label">开机自启</span>
                <span class="setting-desc">系统启动时自动运行</span>
              </div>
              <label class="toggle">
                <input
                  type="checkbox"
                  :checked="settingsStore.autoLaunch"
                  @change="(e) => applySettingChange(() => settingsStore.setAutoLaunch((e.target as HTMLInputElement).checked))"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>

            <!-- 通知位置 -->
            <div class="setting-card position-card">
              <div class="setting-info">
                <span class="setting-label">提醒弹窗位置</span>
                <span class="setting-desc">待办提醒弹窗在屏幕上的位置</span>
              </div>
              <div class="position-options">
                <button
                  v-for="pos in positionOptions"
                  :key="pos.value"
                  class="position-btn"
                  :class="{ active: settingsStore.notificationPosition === pos.value }"
                  :title="pos.label"
                  @click="applySettingChange(() => settingsStore.setNotificationPosition(pos.value))"
                >
                  <div class="position-preview" :class="pos.value">
                    <div class="preview-box"></div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- AI 周报 - 功能暂未完善，注释保留
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">🤖</div>
            <div class="section-title">AI 周报</div>
          </div>
          <div class="section-body">
            <div class="setting-card ai-card">
              <div class="ai-content">
                <div class="ai-label-row">
                  <span class="setting-label">OpenAI API 密钥</span>
                  <span class="setting-desc">用于生成 AI 周报，密钥将本地保存</span>
                </div>
                <div class="ai-input-row">
                  <input 
                    id="apiKey"
                    type="password" 
                    class="ai-input" 
                    placeholder="请输入 API 密钥，如 sk-..."
                  />
                  <button class="btn btn-primary btn-save" @click="handleApiKeySubmit">保存</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        -->
        
        <!-- 快捷键 -->
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">⌨️</div>
            <div class="section-title">快捷键</div>
          </div>
          <div class="section-body">
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
          </div>
        </div>

        <!-- 数据 -->
        <div class="settings-section">
          <div class="section-header">
            <div class="section-icon">💾</div>
            <div class="section-title">数据</div>
          </div>
          <div class="section-body">
            <div class="setting-card data-card">
              <div class="data-row">
                <div class="data-info">
                  <span class="setting-label">数据存储目录</span>
                  <span class="setting-desc">自定义数据文件的存储位置</span>
                </div>
                <button class="btn btn-secondary" @click="handleSelectStorage">选择目录</button>
              </div>
              <div v-if="storagePath" class="data-path">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>{{ storagePath }}</span>
              </div>
              <div v-if="actualDataPath" class="data-path detail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <div>
                  <div>数据: {{ actualDataPath }}</div>
                  <div style="margin-top: 4px;">标签: {{ actualTagsPath }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="settings-footer">
        <button class="btn btn-primary btn-done" @click="emit('close')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          完成
        </button>
      </div>
    </div>
    
    <!-- Toast 通知 -->
    <Toast 
      v-if="showToast"
      :message="toastMessage"
      :type="toastType"
      @close="showToast = false"
    />
  </div>
</template>

<style scoped>
.settings-modal {
  width: min(90vw, 480px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  animation: modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.modal-title {
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--border-color);
  color: var(--text-color);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.settings-error {
  margin-bottom: 16px;
  padding: 10px 12px;
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 12px;
}

.dark .settings-error {
  color: #fecaca;
  background: #451a1a;
  border-color: #7f1d1d;
}

.settings-section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 20px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
  border-radius: 8px;
}

.dark .section-icon {
  background: linear-gradient(135deg, #3730a3, #4f46e5);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-color);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.setting-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.1);
}

.slider-card {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
  background: rgba(74, 144, 226, 0.1);
  padding: 4px 12px;
  border-radius: 20px;
}

.action-card {
  padding: 14px 20px;
}

.shortcut-table {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  gap: 16px;
  border-bottom: 1px solid var(--border-color);
  transition: all 0.2s;
}

/* 新快捷键样式 */
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

.btn-edit {
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

.btn-edit:hover {
  color: var(--primary-color);
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.1);
}

.data-card {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.data-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.data-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.data-path {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 10px 12px;
  border-radius: 8px;
  word-break: break-all;
  line-height: 1.5;
}

.data-path svg {
  flex-shrink: 0;
  margin-top: 2px;
}

.data-path.detail {
  background: rgba(74, 144, 226, 0.08);
  border: 1px dashed var(--border-color);
}

.btn-small {
  padding: 6px 14px;
  font-size: 13px;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
  display: block;
}

.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
  display: block;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 28px;
}

.dark .toggle-slider {
  background-color: #4b5563;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, var(--primary-color), #3b82f6);
}

.toggle input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.range-input {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--border-color);
  outline: none;
  -webkit-appearance: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), #3b82f6);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(74, 144, 226, 0.3);
  transition: all 0.2s;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-color), #3b82f6);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.3);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.4);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
  border-color: var(--primary-color);
}

.settings-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  background: var(--bg-secondary);
}

.btn-done {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
}

/* 通知位置选择样式 */
.position-card {
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
}

.position-options {
  display: flex;
  gap: 8px;
}

.position-btn {
  flex: 1;
  padding: 8px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.position-btn:hover {
  border-color: var(--primary-color);
}

.position-btn.active {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.1);
}

.position-preview {
  width: 40px;
  height: 28px;
  background: var(--border-color);
  border-radius: 4px;
  position: relative;
  margin: 0 auto;
}

.position-preview .preview-box {
  width: 16px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 2px;
  position: absolute;
}

.position-preview.top-left .preview-box {
  top: 4px;
  left: 4px;
}

.position-preview.top-right .preview-box {
  top: 4px;
  right: 4px;
}

.position-preview.bottom-left .preview-box {
  bottom: 4px;
  left: 4px;
}

.position-preview.bottom-right .preview-box {
  bottom: 4px;
  right: 4px;
}
</style>
