import { describe, it, expect } from 'vitest'
import { createStoreValueValidators, CONFIG_READ_KEYS, CONFIG_WRITE_KEYS, ALLOWED_EXTERNAL_ORIGINS } from '../electron/ipc-security'

const validators = createStoreValueValidators()

describe('CONFIG_READ_KEYS', () => {
  it('包含预期键', () => {
    expect(CONFIG_READ_KEYS.has('storagePath')).toBe(true)
    expect(CONFIG_READ_KEYS.has('quickAddKey')).toBe(true)
    expect(CONFIG_READ_KEYS.has('toggleMainKey')).toBe(true)
  })
})

describe('CONFIG_WRITE_KEYS', () => {
  it('只包含快捷键配置', () => {
    expect(CONFIG_WRITE_KEYS.has('quickAddKey')).toBe(true)
    expect(CONFIG_WRITE_KEYS.has('toggleMainKey')).toBe(true)
    expect(CONFIG_WRITE_KEYS.has('storagePath')).toBe(false)
  })
})

describe('ALLOWED_EXTERNAL_ORIGINS', () => {
  it('默认空集合', () => {
    expect(ALLOWED_EXTERNAL_ORIGINS.size).toBe(0)
  })
})

describe('createStoreValueValidators', () => {
  describe('darkMode / alwaysOnTop / minimizeToTray / autoLaunch', () => {
    it('boolean 通过', () => {
      ;['darkMode', 'alwaysOnTop', 'minimizeToTray', 'autoLaunch'].forEach(key => {
        expect(validators[key](true)).toBe(true)
        expect(validators[key](false)).toBe(true)
      })
    })
    it('非 boolean 拒绝', () => {
      ;['darkMode', 'alwaysOnTop', 'minimizeToTray', 'autoLaunch'].forEach(key => {
        expect(validators[key]('true')).toBe(false)
        expect(validators[key](1)).toBe(false)
        expect(validators[key](null)).toBe(false)
      })
    })
  })

  describe('notificationPosition', () => {
    it('四个合法值通过', () => {
      ;['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach(v => {
        expect(validators.notificationPosition(v)).toBe(true)
      })
    })
    it('非法值拒绝', () => {
      expect(validators.notificationPosition('center')).toBe(false)
      expect(validators.notificationPosition(123)).toBe(false)
    })
  })

  describe('filterSearchQuery / currentTheme', () => {
    it('string 通过', () => {
      expect(validators.filterSearchQuery('test')).toBe(true)
      expect(validators.currentTheme('dark')).toBe(true)
    })
    it('非 string 拒绝', () => {
      expect(validators.filterSearchQuery(123)).toBe(false)
    })
  })

  describe('bgSize', () => {
    it('三个合法值通过', () => {
      ;['cover', 'contain', '100% 100%'].forEach(v => {
        expect(validators.bgSize(v)).toBe(true)
      })
    })
    it('非法值拒绝', () => {
      expect(validators.bgSize('auto')).toBe(false)
    })
  })

  describe('uiTransparency', () => {
    it('0-100 整数通过', () => {
      ;[0, 50, 100].forEach(v => expect(validators.uiTransparency(v)).toBe(true))
    })
    it('浮点数通过', () => {
      expect(validators.uiTransparency(50.5)).toBe(true)
    })
    it('负数拒绝', () => {
      expect(validators.uiTransparency(-1)).toBe(false)
    })
    it('大于 100 拒绝', () => {
      expect(validators.uiTransparency(101)).toBe(false)
    })
    it('非数字拒绝', () => {
      expect(validators.uiTransparency('50')).toBe(false)
      expect(validators.uiTransparency(NaN)).toBe(false)
      expect(validators.uiTransparency(Infinity)).toBe(false)
    })
  })

  describe('bgOpacity (旧键,兼容)', () => {
    it('同 uiTransparency 逻辑', () => {
      ;[0, 50, 100].forEach(v => expect(validators.bgOpacity(v)).toBe(true))
      expect(validators.bgOpacity(-1)).toBe(false)
      expect(validators.bgOpacity(101)).toBe(false)
    })
  })

  describe('todayBtnPosition', () => {
    it('合法对象通过', () => {
      expect(validators.todayBtnPosition({ right: 10, bottom: 20 })).toBe(true)
      expect(validators.todayBtnPosition({ right: 0, bottom: 0 })).toBe(true)
      expect(validators.todayBtnPosition({ right: 100.5, bottom: 200.5 })).toBe(true)
    })
    it('缺少字段拒绝', () => {
      expect(validators.todayBtnPosition({ right: 10 })).toBe(false)
      expect(validators.todayBtnPosition({ bottom: 20 })).toBe(false)
    })
    it('非数字拒绝', () => {
      expect(validators.todayBtnPosition({ right: '10', bottom: 20 })).toBe(false)
      expect(validators.todayBtnPosition({ right: 10, bottom: '20' })).toBe(false)
    })
    it('负数拒绝', () => {
      expect(validators.todayBtnPosition({ right: -1, bottom: 20 })).toBe(false)
      expect(validators.todayBtnPosition({ right: 10, bottom: -1 })).toBe(false)
    })
    it('NaN/Infinity 拒绝', () => {
      expect(validators.todayBtnPosition({ right: NaN, bottom: 20 })).toBe(false)
      expect(validators.todayBtnPosition({ right: 10, bottom: Infinity })).toBe(false)
    })
    it('null/undefined 非对象拒绝', () => {
      expect(validators.todayBtnPosition(null)).toBe(false)
      expect(validators.todayBtnPosition(undefined)).toBe(false)
      expect(validators.todayBtnPosition('string')).toBe(false)
    })
  })
})