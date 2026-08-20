<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'
import Toast from './Toast.vue'
import AppearanceSection from './settings/AppearanceSection.vue'
import WindowSection from './settings/WindowSection.vue'
import SystemSection from './settings/SystemSection.vue'
import ShortcutSection from './settings/ShortcutSection.vue'
import DataSection from './settings/DataSection.vue'

const settingsStore = useSettingsStore()

// Toast 状态
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('success')

const emit = defineEmits<{
  close: []
}>()

function handleToast(payload: { message: string; type: 'success' | 'error' | 'info' }) {
  toastMessage.value = payload.message
  toastType.value = payload.type
  showToast.value = true
}

function handleReload() {
  setTimeout(() => window.location.reload(), 300)
}
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

        <AppearanceSection @toast="handleToast" />
        <WindowSection @toast="handleToast" />
        <SystemSection @toast="handleToast" />
        <ShortcutSection @toast="handleToast" />
        <DataSection @toast="handleToast" @reload="handleReload" />
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

.settings-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  background: var(--bg-secondary);
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

.btn-done {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
}
</style>
