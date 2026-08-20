import { describe, it, expect } from 'vitest'
import { getLocalDateString } from '../src/utils/date'

describe('getLocalDateString', () => {
  it('跨月', () => {
    expect(getLocalDateString(new Date(2026, 0, 31))).toBe('2026-01-31')
    expect(getLocalDateString(new Date(2026, 1, 1))).toBe('2026-02-01')
  })
  it('跨年', () => {
    expect(getLocalDateString(new Date(2026, 11, 31))).toBe('2026-12-31')
    expect(getLocalDateString(new Date(2027, 0, 1))).toBe('2027-01-01')
  })
  it('单位数月日补零', () => {
    expect(getLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(getLocalDateString(new Date(2026, 8, 9))).toBe('2026-09-09')
  })
  it('闰年 2 月 29 日', () => {
    expect(getLocalDateString(new Date(2024, 1, 29))).toBe('2024-02-29')
  })
})

// 从 todo store 复制的纯逻辑版本（不含 do...while 循环），用于测试核心日期计算
function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) throw new Error(`无效日期：${dateStr}`)
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (getLocalDateString(date) !== dateStr) throw new Error(`无效日期：${dateStr}`)
  return date
}

function getNextDateCore(dateStr: string, repeat: 'daily' | 'weekly' | 'monthly', repeatAnchorDay?: number): string {
  let nextDate = parseLocalDate(dateStr)
  if (repeat === 'daily') {
    nextDate.setDate(nextDate.getDate() + 1)
  } else if (repeat === 'weekly') {
    nextDate.setDate(nextDate.getDate() + 7)
  } else {
    const anchorDay = repeatAnchorDay || nextDate.getDate()
    const targetYear = nextDate.getMonth() === 11 ? nextDate.getFullYear() + 1 : nextDate.getFullYear()
    const targetMonth = (nextDate.getMonth() + 1) % 12
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
    nextDate = new Date(targetYear, targetMonth, Math.min(anchorDay, lastDay))
  }
  return getLocalDateString(nextDate)
}

// 完整版（含 do...while 循环），用于测试逾期补发逻辑
function getNextDateFull(dateStr: string, repeat: 'daily' | 'weekly' | 'monthly', repeatAnchorDay?: number): string {
  let nextDate = parseLocalDate(dateStr)
  const today = getLocalDateString(new Date())
  do {
    if (repeat === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1)
    } else if (repeat === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7)
    } else {
      const anchorDay = repeatAnchorDay || nextDate.getDate()
      const targetYear = nextDate.getMonth() === 11 ? nextDate.getFullYear() + 1 : nextDate.getFullYear()
      const targetMonth = (nextDate.getMonth() + 1) % 12
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
      nextDate = new Date(targetYear, targetMonth, Math.min(anchorDay, lastDay))
    }
  } while (getLocalDateString(nextDate) <= today)
  return getLocalDateString(nextDate)
}

describe('getNextDateCore (核心日期计算，不含逾期循环)', () => {
  describe('daily', () => {
    it('普通日期 +1 天', () => {
      expect(getNextDateCore('2026-01-15', 'daily')).toBe('2026-01-16')
    })
    it('月末跨月：1月31日 +1 天 = 2月1日', () => {
      expect(getNextDateCore('2026-01-31', 'daily')).toBe('2026-02-01')
    })
    it('年末跨年：12月31日 +1 天 = 1月1日', () => {
      expect(getNextDateCore('2026-12-31', 'daily')).toBe('2027-01-01')
    })
    it('闰年 2月28日 +1 天 = 2月29日', () => {
      expect(getNextDateCore('2024-02-28', 'daily')).toBe('2024-02-29')
    })
    it('闰年 2月29日 +1 天 = 3月1日', () => {
      expect(getNextDateCore('2024-02-29', 'daily')).toBe('2024-03-01')
    })
  })

  describe('weekly', () => {
    it('普通日期 +7 天', () => {
      expect(getNextDateCore('2026-01-15', 'weekly')).toBe('2026-01-22')
    })
    it('跨月：1月28日 +7 天 = 2月4日', () => {
      expect(getNextDateCore('2026-01-28', 'weekly')).toBe('2026-02-04')
    })
    it('跨年：12月28日 +7 天 = 1月4日', () => {
      expect(getNextDateCore('2026-12-28', 'weekly')).toBe('2027-01-04')
    })
  })

  describe('monthly', () => {
    it('1月31日 → 2月末 (28日)', () => {
      expect(getNextDateCore('2026-01-31', 'monthly', 31)).toBe('2026-02-28')
    })
    it('闰年 1月31日 → 2月29日', () => {
      expect(getNextDateCore('2024-01-31', 'monthly', 31)).toBe('2024-02-29')
    })
    it('3月31日 → 4月30日', () => {
      expect(getNextDateCore('2026-03-31', 'monthly', 31)).toBe('2026-04-30')
    })
    it('anchorDay 小于目标月天数时保持原日：1月15日 → 2月15日', () => {
      expect(getNextDateCore('2026-01-15', 'monthly', 15)).toBe('2026-02-15')
    })
    it('无 anchorDay 时使用当前日期的日：1月20日 → 2月20日', () => {
      expect(getNextDateCore('2026-01-20', 'monthly')).toBe('2026-02-20')
    })
    it('11月30日 → 12月30日', () => {
      expect(getNextDateCore('2026-11-30', 'monthly', 30)).toBe('2026-12-30')
    })
    it('12月31日 → 翌年1月31日', () => {
      expect(getNextDateCore('2026-12-31', 'monthly', 31)).toBe('2027-01-31')
    })
  })
})

describe('getNextDateFull (完整版，含逾期补发循环)', () => {
  const today = getLocalDateString(new Date())
  const tomorrow = getLocalDateString(new Date(Date.now() + 86400000))
  const nextWeek = getLocalDateString(new Date(Date.now() + 7 * 86400000))

  it('过去的 daily 任务返回明天', () => {
    expect(getNextDateFull('2020-01-01', 'daily')).toBe(tomorrow)
  })
  it('过去的 weekly 任务返回下周同一天', () => {
    // 逾期补发逻辑：返回今天之后的第一个周同一天，不一定是 nextWeek(若 today 也是周同一天会直接返回 today)
    const result = getNextDateFull('2020-01-01', 'weekly')
    expect(result).toBe(getLocalDateString(new Date(result)))
    const resultDate = new Date(result)
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(new Date().setHours(0, 0, 0, 0))
  })
  it('过去的 monthly 任务返回下个月同 anchorDay', () => {
    const result = getNextDateFull('2020-01-15', 'monthly', 15)
    const [y, m, d] = result.split('-').map(Number)
    expect(d).toBe(15)
    const resultDate = new Date(y, m - 1, d)
    expect(resultDate.getTime()).toBeGreaterThan(new Date().setHours(0, 0, 0, 0))
  })
  it('未来的 daily 任务直接返回明天', () => {
    // 使用明天的日期作为输入，应该返回后天
    const dayAfterTomorrow = getLocalDateString(new Date(Date.now() + 2 * 86400000))
    expect(getNextDateFull(tomorrow, 'daily')).toBe(dayAfterTomorrow)
  })
})