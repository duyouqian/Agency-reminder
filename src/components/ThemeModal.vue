<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore } from '../stores/theme'
import PresetThemeGrid from './theme/PresetThemeGrid.vue'
import CustomBackgroundSection from './theme/CustomBackgroundSection.vue'

const themeStore = useThemeStore()
const activeTab = ref('preset') // 'preset' | 'custom'

const emit = defineEmits<{
  close: []
}>()

async function selectTheme(themeId: string) {
  await themeStore.setTheme(themeId)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal theme-modal">
      <div class="modal-header">
        <div class="modal-title">主题设置</div>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <!-- 标签切换 -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'preset' }"
          @click="activeTab = 'preset'"
        >
          预设主题
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'custom' }"
          @click="activeTab = 'custom'"
        >
          自定义背景
        </button>
      </div>

      <!-- 预设主题 -->
      <PresetThemeGrid v-if="activeTab === 'preset'" @select="selectTheme" />

      <!-- 自定义背景 -->
      <CustomBackgroundSection v-else />
    </div>
  </div>
</template>

<style scoped>
.theme-modal {
  width: min(90vw, 420px);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: modalEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-color);
  color: var(--text-color);
}

/* 标签栏 */
.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 10px;
}

.tab-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-color);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}
</style>
