/**
 * 获取本地日期字符串（YYYY-MM-DD），避免 toISOString 的 UTC 时区问题。
 * 与 src/utils/date.ts 中的 getLocalDateString 保持功能一致。
 */
export function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
