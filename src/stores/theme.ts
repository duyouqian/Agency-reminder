import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export interface Theme {
  id: string
  name: string
  primaryColor: string
  bgColor: string
  bgSecondary: string
  bgColorRgb: string // RGB值用于半透明
  bgSecondaryRgb: string
  textColor: string
  textSecondary: string
  borderColor: string
  gradient: string
}

// 预设主题
export const presetThemes: Theme[] = [
  {
    id: 'default',
    name: '清新蓝',
    primaryColor: '#4a90e2',
    bgColor: '#f8fafc',
    bgSecondary: '#ffffff',
    bgColorRgb: '248, 250, 252',
    bgSecondaryRgb: '255, 255, 255',
    textColor: '#1e293b',
    textSecondary: '#64748b',
    borderColor: '#e2e8f0',
    gradient: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)'
  },
  {
    id: 'purple',
    name: '优雅紫',
    primaryColor: '#8b5cf6',
    bgColor: '#faf5ff',
    bgSecondary: '#ffffff',
    bgColorRgb: '250, 245, 255',
    bgSecondaryRgb: '255, 255, 255',
    textColor: '#2e1065',
    textSecondary: '#7c3aed',
    borderColor: '#e9d5ff',
    gradient: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)'
  },
  {
    id: 'green',
    name: '自然绿',
    primaryColor: '#10b981',
    bgColor: '#f0fdf4',
    bgSecondary: '#ffffff',
    bgColorRgb: '240, 253, 244',
    bgSecondaryRgb: '255, 255, 255',
    textColor: '#064e3b',
    textSecondary: '#059669',
    borderColor: '#bbf7d0',
    gradient: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)'
  },
  {
    id: 'orange',
    name: '暖阳橙',
    primaryColor: '#f97316',
    bgColor: '#fff7ed',
    bgSecondary: '#ffffff',
    bgColorRgb: '255, 247, 237',
    bgSecondaryRgb: '255, 255, 255',
    textColor: '#7c2d12',
    textSecondary: '#ea580c',
    borderColor: '#fed7aa',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
  },
  {
    id: 'pink',
    name: '少女粉',
    primaryColor: '#ec4899',
    bgColor: '#fdf2f8',
    bgSecondary: '#ffffff',
    bgColorRgb: '253, 242, 248',
    bgSecondaryRgb: '255, 255, 255',
    textColor: '#831843',
    textSecondary: '#db2777',
    borderColor: '#fbcfe8',
    gradient: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)'
  },
  {
    id: 'dark',
    name: '深邃黑',
    primaryColor: '#60a5fa',
    bgColor: '#0f172a',
    bgSecondary: '#1e293b',
    bgColorRgb: '15, 23, 42',
    bgSecondaryRgb: '30, 41, 59',
    textColor: '#f1f5f9',
    textSecondary: '#94a3b8',
    borderColor: '#334155',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
  }
]

// 背景显示比例选项
export const bgSizeOptions = [
  { value: 'cover', label: '填充' },
  { value: 'contain', label: '适应' },
  { value: '100% 100%', label: '拉伸' }
]

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref('default')
  const customBgImage = ref('')
  const customTheme = ref<Partial<Theme>>({})
  const bgSize = ref('cover')
  const uiTransparency = ref(100)

  const currentTheme = computed((): Theme => {
    const preset = presetThemes.find(t => t.id === currentThemeId.value)
    if (preset) {
      return { ...preset, ...customTheme.value }
    }
    return presetThemes[0]
  })

  const isDarkTheme = computed(() => currentThemeId.value === 'dark')

  // 应用主题到 CSS 变量
  function applyTheme() {
    const theme = currentTheme.value
    const root = document.documentElement

    root.style.setProperty('--primary-color', theme.primaryColor)
    root.style.setProperty('--bg-color', theme.bgColor)
    root.style.setProperty('--bg-secondary', theme.bgSecondary)
    root.style.setProperty('--text-color', theme.textColor)
    root.style.setProperty('--text-secondary', theme.textSecondary)
    root.style.setProperty('--border-color', theme.borderColor)
    root.style.setProperty('--bg-color-rgb', theme.bgColorRgb)
    root.style.setProperty('--bg-secondary-rgb', theme.bgSecondaryRgb)

    // 应用背景图 - 使用 CSS 变量确保优先级
    if (customBgImage.value) {
      root.style.setProperty('--bg-image', `url(${customBgImage.value})`)
      root.style.setProperty('--bg-size', bgSize.value)
      root.classList.add('has-bg-image')
      // 设置界面元素透明度（值越大，待办越透明，背景越清晰）
      // uiTransparency = 0 时 opacity = 1（待办完全不透明）
      // uiTransparency = 100 时 opacity = 0（待办完全透明，背景最清晰）
      const opacity = (100 - uiTransparency.value) / 100
      root.style.setProperty('--ui-opacity', String(opacity))
    } else {
      root.style.setProperty('--bg-image', 'none')
      root.style.setProperty('--ui-opacity', '1')
      root.classList.remove('has-bg-image')
    }

    // 应用暗黑模式
    root.classList.toggle('dark', isDarkTheme.value)
  }

  async function setTheme(themeId: string): Promise<OperationResult> {
    const result = await window.electronAPI.setStore('currentTheme', themeId)
    if (!result.success) return result
    currentThemeId.value = themeId
    applyTheme()
    return { success: true }
  }

  function setCustomBgImage(imagePath: string) {
    customBgImage.value = imagePath
    applyTheme()
  }

  async function setBgSize(size: string): Promise<OperationResult> {
    const result = await window.electronAPI.setStore('bgSize', size)
    if (!result.success) return result
    bgSize.value = size
    applyTheme()
    return { success: true }
  }

  async function setUiTransparency(transparency: number): Promise<OperationResult> {
    const result = await window.electronAPI.setStore('uiTransparency', transparency)
    if (!result.success) return result
    uiTransparency.value = transparency
    applyTheme()
    return { success: true }
  }

  async function clearCustomBgImage(): Promise<OperationResult> {
    const deleteResult = await window.electronAPI.deleteBgImage()
    if (!deleteResult.success) {
      return deleteResult
    }
    customBgImage.value = ''
    applyTheme()
    return { success: true }
  }

  async function loadTheme() {
    const savedTheme = await window.electronAPI.getStore('currentTheme')
    const savedBgImage = await window.electronAPI.getBgImage()
    const savedBgSize = await window.electronAPI.getStore('bgSize')
    const savedUiTransparency = await window.electronAPI.getStore('uiTransparency')
    const legacyBgOpacity = savedUiTransparency === undefined || savedUiTransparency === null
      ? await window.electronAPI.getStore('bgOpacity')
      : null
    
    if (savedTheme) {
      currentThemeId.value = savedTheme
    }
    if (savedBgImage) {
      customBgImage.value = savedBgImage
    }
    if (savedBgSize) {
      bgSize.value = savedBgSize
    }
    const savedTransparency = savedUiTransparency ?? legacyBgOpacity
    if (typeof savedTransparency === 'number') {
      uiTransparency.value = savedTransparency
      if ((savedUiTransparency === undefined || savedUiTransparency === null) && legacyBgOpacity !== null) {
        // 兼容旧配置：只迁移数值，不改变现有透明度计算语义。
        await window.electronAPI.setStore('uiTransparency', legacyBgOpacity)
      }
    }
    
    applyTheme()
  }

  // 监听主题变化
  watch(currentTheme, applyTheme, { deep: true })

  return {
    currentThemeId,
    currentTheme,
    customBgImage,
    bgSize,
    uiTransparency,
    isDarkTheme,
    presetThemes,
    bgSizeOptions,
    setTheme,
    setCustomBgImage,
    setBgSize,
    setUiTransparency,
    clearCustomBgImage,
    loadTheme,
    applyTheme
  }
})
