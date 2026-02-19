const MS_PER_DAY = 1000 * 60 * 60 * 24

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1
}

export function calculateNights(days: number): number {
  return Math.max(0, days - 1)
}

export function getYearFromDate(date: Date): string {
  return String(date.getFullYear())
}

export function isDateBeforeToday(timestamp: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return timestamp < today.getTime()
}

export function isDateBefore(timestamp: number, referenceTimestamp: number): boolean {
  return timestamp < referenceTimestamp
}
