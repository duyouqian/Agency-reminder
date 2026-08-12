<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useThemeStore, presetThemes, bgSizeOptions } from '../stores/theme'

const themeStore = useThemeStore()
const activeTab = ref('preset') // 'preset' | 'custom'
const fileInput = ref<HTMLInputElement | null>(null)
const backgroundError = ref('')

const emit = defineEmits<{
  close: []
}>()

async function selectTheme(themeId: string) {
  const result = await themeStore.setTheme(themeId)
  backgroundError.value = result.success ? '' : result.error || '主题保存失败'
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string
      backgroundError.value = ''
      // 保存图片到数据目录
      const savedPath = await window.electronAPI.saveBgImage?.(result)
      if (savedPath) {
        // 重新读取图片作为 base64 显示
        const imageData = await window.electronAPI.getBgImage?.()
        if (imageData) {
          themeStore.setCustomBgImage(imageData)
        }
      } else {
        backgroundError.value = '背景图片保存失败，请检查文件大小和存储目录权限'
      }
    }
    reader.readAsDataURL(file)
  }
}

async function clearBackground() {
  const result = await themeStore.clearCustomBgImage()
  backgroundError.value = result.success ? '' : result.error || '背景图片删除失败'
}

async function handleBgSizeChange(size: string) {
  const result = await themeStore.setBgSize(size)
  backgroundError.value = result.success ? '' : result.error || '背景显示比例保存失败'
}

async function handleOpacityChange(value: number) {
  const result = await themeStore.setUiTransparency(value)
  backgroundError.value = result.success ? '' : result.error || '界面透明度保存失败'
}

// 加载已保存的背景图片
onMounted(async () => {
  if (!themeStore.customBgImage) {
    const savedImage = await window.electronAPI.getBgImage?.()
    if (savedImage) {
      themeStore.setCustomBgImage(savedImage)
    }
  }
})
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
      <div v-if="activeTab === 'preset'" class="theme-grid">
        <div
          v-for="theme in presetThemes"
          :key="theme.id"
          class="theme-card"
          :class="{ active: themeStore.currentThemeId === theme.id }"
          @click="selectTheme(theme.id)"
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
      
      <!-- 自定义背景 -->
      <div v-else class="custom-bg-section">
        <div v-if="backgroundError" class="background-error" role="alert">{{ backgroundError }}</div>
        <div class="upload-area" @click="triggerFileInput">
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/gif"
            style="display: none"
            @change="handleFileChange"
          />
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p class="upload-text">点击上传背景图片</p>
          <p class="upload-hint">支持 JPG、PNG、GIF 格式</p>
        </div>
        
        <div v-if="themeStore.customBgImage" class="current-bg">
          <p class="section-title">当前背景</p>
          <div class="bg-preview">
            <img :src="themeStore.customBgImage" alt="当前背景" />
          </div>
          
          <!-- 显示比例 -->
          <div class="control-group">
            <label class="control-label">显示比例</label>
            <div class="size-options">
              <button
                v-for="opt in bgSizeOptions"
                :key="opt.value"
                class="size-btn"
                :class="{ active: themeStore.bgSize === opt.value }"
                @click="handleBgSizeChange(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
          
          <!-- 透明度 -->
          <div class="control-group">
            <label class="control-label">界面透明度: {{ themeStore.uiTransparency }}%</label>
            <p class="control-hint">数值越大，待办越透明，背景图片越清晰</p>
            <input
              type="range"
              min="0"
              max="100"
              :value="themeStore.uiTransparency"
              @input="handleOpacityChange(($event.target as HTMLInputElement).valueAsNumber)"
              class="opacity-slider"
            />
          </div>
          
          <button class="remove-btn" @click="clearBackground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            移除背景
          </button>
        </div>
      </div>
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

.background-error {
  margin-bottom: 12px;
  padding: 8px 10px;
  color: #991b1b;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 12px;
}

.dark .background-error {
  color: #fecaca;
  background: #451a1a;
  border-color: #7f1d1d;
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

/* 自定义背景 */
.custom-bg-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-color);
}

.upload-area:hover {
  border-color: var(--primary-color);
  background: rgba(74, 144, 226, 0.05);
}

.upload-icon {
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.upload-text {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
  margin: 0 0 6px;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 12px;
}

.current-bg {
  background: var(--bg-color);
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bg-preview img {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
}

.control-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 4px 0 8px;
}

.size-options {
  display: flex;
  gap: 8px;
}

.size-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.size-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.size-btn.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.opacity-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  border-radius: 3px;
  outline: none;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s;
}

.opacity-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

.remove-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px solid #ff4d4f;
  background: transparent;
  color: #ff4d4f;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #ff4d4f;
  color: white;
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
