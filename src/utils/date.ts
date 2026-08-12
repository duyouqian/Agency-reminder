import chineseDays from 'chinese-days'

export type ChineseDayType = 'holiday' | 'makeup-workday' | 'weekend' | 'workday' | 'unavailable'

export interface ChineseDayInfo {
  date: string
  type: ChineseDayType
  name: string
  isHoliday: boolean
  isWorkday: boolean
  isWeekend: boolean
  isInLieu: boolean
  isSupportedYear: boolean
}

const supportedHolidayYears = new Map<number, boolean>()

/**
 * 获取本地日期字符串（YYYY-MM-DD），避免 toISOString 的 UTC 时区问题
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 判断离线依赖是否包含指定年份的官方节假日安排
 */
export function hasChineseHolidayData(year: number): boolean {
  const cachedResult = supportedHolidayYears.get(year)
  if (cachedResult !== undefined) {
    return cachedResult
  }

  const hasData = Number.isInteger(year) && chineseDays.getHolidaysInRange(
    `${year}-01-01`,
    `${year}-12-31`,
    false
  ).length > 0
  supportedHolidayYears.set(year, hasData)
  return hasData
}

/**
 * 将 chinese-days 的中英文描述转换为页面使用的中文节日名称
 */
function getChineseHolidayName(description: string): string {
  const [, chineseName] = description.split(',')
  return chineseName || description
}

/**
 * 获取标准化的中国节假日信息；未收录年份不会按往年规律推算
 */
export function getChineseDayInfo(date: Date): ChineseDayInfo {
  const dateString = getLocalDateString(date)
  const isWeekend = date.getDay() === 0 || date.getDay() === 6
  const isSupportedYear = hasChineseHolidayData(date.getFullYear())

  if (!isSupportedYear) {
    return {
      date: dateString,
      type: 'unavailable',
      name: '',
      isHoliday: false,
      isWorkday: false,
      isWeekend,
      isInLieu: false,
      isSupportedYear: false
    }
  }

  const detail = chineseDays.getDayDetail(dateString)
  const hasHolidayDescription = detail.name.includes(',')

  if (detail.work && hasHolidayDescription) {
    return {
      date: dateString,
      type: 'makeup-workday',
      name: getChineseHolidayName(detail.name),
      isHoliday: false,
      isWorkday: true,
      isWeekend,
      isInLieu: false,
      isSupportedYear: true
    }
  }

  if (!detail.work && hasHolidayDescription) {
    return {
      date: dateString,
      type: 'holiday',
      name: getChineseHolidayName(detail.name),
      isHoliday: true,
      isWorkday: false,
      isWeekend,
      isInLieu: chineseDays.isInLieu(dateString),
      isSupportedYear: true
    }
  }

  return {
    date: dateString,
    type: isWeekend ? 'weekend' : 'workday',
    name: '',
    isHoliday: false,
    isWorkday: !isWeekend,
    isWeekend,
    isInLieu: false,
    isSupportedYear: true
  }
}
