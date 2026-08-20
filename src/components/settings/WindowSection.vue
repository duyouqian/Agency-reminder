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
  <SettingsSection icon="🪟" title="窗口">
    <SettingToggle
      label="窗口置顶"
      desc="主窗口始终显示在最前面"
      :checked="settingsStore.alwaysOnTop"
      @change="(v) => applySettingChange(() => settingsStore.setAlwaysOnTop(v))"
    />
    <SettingToggle
      label="关闭时最小化到托盘"
      desc="关闭窗口时保持在后台运行"
      :checked="settingsStore.minimizeToTray"
      @change="(v) => applySettingChange(() => settingsStore.setMinimizeToTray(v))"
    />
  </SettingsSection>
</template>
