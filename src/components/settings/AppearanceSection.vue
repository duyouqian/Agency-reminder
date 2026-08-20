<script setup lang="ts">
import { useSettingsStore } from '../../stores/settings'
import type { OperationResult } from '../../../electron/ipc-types'
import SettingsSection from './SettingsSection.vue'
import SettingToggle from './SettingToggle.vue'

const settingsStore = useSettingsStore()

const emit = defineEmits<{
  toast: [payload: { message: string; type: 'success' | 'error' | 'info' }]
}>()

async function applySettingChange(action: () => Promise<OperationResult>) {
  const result = await action()
  if (!result.success) {
    emit('toast', { message: result.error || '设置保存失败', type: 'error' })
  }
}
</script>

<template>
  <SettingsSection icon="🎨" title="外观">
    <SettingToggle
      label="深色模式"
      desc="切换深色/浅色主题"
      :checked="settingsStore.darkMode"
      @change="(v) => applySettingChange(() => settingsStore.setDarkMode(v))"
    />
  </SettingsSection>
</template>
