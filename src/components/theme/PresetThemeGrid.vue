<script setup lang="ts">
import { useThemeStore, presetThemes } from '../../stores/theme'

const themeStore = useThemeStore()

const emit = defineEmits<{
  select: [themeId: string]
}>()
</script>

<template>
  <div class="theme-grid">
    <div
      v-for="theme in presetThemes"
      :key="theme.id"
      class="theme-card"
      :class="{ active: themeStore.currentThemeId === theme.id }"
      @click="emit('select', theme.id)"
    >
      <div class="theme-preview" :style="{ background: theme.gradient }">
        <div class="preview-content">
          <div class="preview-dot" :style="{ background: theme.primaryColor }"></div>
          <div class="preview-text" :style="{ color: theme.textColor }">Aa</div>
        </div>
      </div>
      <div class="theme-info">
        <span class="theme-name">{{ theme.name }}</span>
        <span v-if="themeStore.currentThemeId === theme.id" class="active-badge">使用中</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.theme-card {
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
  background: var(--bg-color);
}

.theme-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-card.active {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

.theme-preview {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.preview-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.preview-text {
  font-size: 16px;
  font-weight: 700;
}

.theme-info {
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.theme-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.active-badge {
  font-size: 10px;
  color: var(--primary-color);
  background: rgba(74, 144, 226, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

/* 滚动条样式 */
.theme-grid::-webkit-scrollbar {
  width: 4px;
}

.theme-grid::-webkit-scrollbar-track {
  background: transparent;
}

.theme-grid::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}
</style>
