<script setup lang="ts">
import { appBranding } from '../../config/branding'

const emit = defineEmits<{
  openOverview: []
  openStats: []
  openTags: []
  openTheme: []
  openSettings: []
}>()

// 窗口控制
function minimizeWindow() {
  window.electronAPI.minimizeWindow?.()
}

function maximizeWindow() {
  window.electronAPI.maximizeWindow?.()
}

function closeWindow() {
  window.electronAPI.closeWindow?.()
}
</script>

<template>
  <div class="title-bar">
    <div class="title-bar-drag">
      <span class="app-title">{{ appBranding.displayName }}</span>
    </div>
    <div class="title-bar-actions">
      <div class="title-bar-divider"></div>
      <button class="title-btn" @click="emit('openOverview')" title="总览">
        <span class="btn-emoji">📊</span>
      </button>
      <button class="title-btn" @click="emit('openStats')" title="统计">
        <span class="btn-emoji">📈</span>
      </button>
      <button class="title-btn" @click="emit('openTags')" title="标签管理">
        <span class="btn-emoji">🏷️</span>
      </button>
      <button class="title-btn" @click="emit('openTheme')" title="主题">
        <span class="btn-emoji">🎨</span>
      </button>
      <button class="title-btn" @click="emit('openSettings')" title="设置">
        <span class="btn-emoji">⚙️</span>
      </button>
    </div>
    <div class="window-controls">
      <button class="window-btn minimize" @click="minimizeWindow" title="最小化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect y="5" width="12" height="2" fill="currentColor"/>
        </svg>
      </button>
      <button class="window-btn maximize" @click="maximizeWindow" title="最大化">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect x="1" y="1" width="10" height="10" stroke="currentColor" stroke-width="2" fill="none"/>
        </svg>
      </button>
      <button class="window-btn close" @click="closeWindow" title="关闭">
        <svg width="12" height="12" viewBox="0 0 12 12">
          <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="2"/>
          <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 标题栏样式 */
.title-bar {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--bg-secondary);
  -webkit-app-region: drag;
  padding: 0 8px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* 有背景图时的透明效果 */
:global(.has-bg-image) .title-bar {
  background: rgba(var(--bg-secondary-rgb), var(--ui-opacity));
  backdrop-filter: blur(10px);
}

.title-bar-drag {
  flex: 1;
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-left: 8px;
}

.title-bar-actions {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.title-btn {
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s;
}

.title-btn:hover {
  background: var(--bg-color);
  color: var(--primary-color);
}

.btn-emoji {
  font-size: 14px;
  line-height: 1;
}

.title-btn.active {
  background: var(--primary-color);
  color: white;
}

.title-bar-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 4px;
}

.window-controls {
  display: flex;
  margin-left: 8px;
  -webkit-app-region: no-drag;
}

.window-btn {
  width: 32px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.window-btn:hover {
  background: var(--bg-color);
}

.window-btn.close:hover {
  background: #e81123;
  color: white;
}
</style>
