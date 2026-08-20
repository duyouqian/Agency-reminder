<script setup lang="ts">
import { ref, onMounted } from 'vue'
import SettingsSection from './SettingsSection.vue'

const emit = defineEmits<{
  toast: [payload: { message: string; type: 'success' | 'error' | 'info' }]
  reload: []
}>()

const storagePath = ref('')
const actualDataPath = ref('')
const actualTagsPath = ref('')

onMounted(async () => {
  try {
    storagePath.value = (await window.electronAPI.getConfig('storagePath')) as string || ''

    // 获取实际的数据文件路径
    const storageInfo = await window.electronAPI.getStorageInfo?.()
    if (storageInfo) {
      actualDataPath.value = storageInfo.dataPath
      actualTagsPath.value = storageInfo.tagsPath
    }
  } catch (error) {
    emit('toast', {
      message: error instanceof Error ? error.message : '设置数据加载失败',
      type: 'error'
    })
  }
})

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
      emit('toast', {
        message: result.data.mode === 'unchanged' ? '当前已经使用该目录' : '数据已迁移到新目录',
        type: 'success'
      })
      if (result.data.reloadRequired) {
        emit('reload')
      }
    } else if (!result.canceled) {
      emit('toast', { message: result.error || '数据迁移失败', type: 'error' })
    }
  } catch (err) {
    // 选择目录失败
    emit('toast', { message: '选择目录失败', type: 'error' })
  }
}
</script>

<template>
  <SettingsSection icon="💾" title="数据">
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
  </SettingsSection>
</template>

<style scoped>
.setting-card {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s;
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

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
  border-color: var(--primary-color);
}
</style>
