const pad2 = (value: number) => String(value).padStart(2, '0')

export const getLocalDateString = (date: Date = new Date()) => {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

export const getLocalDateOffsetString = (offsetDays: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return getLocalDateString(date)
}

export const getTodayTagText = (date: Date = new Date()) => {
  return `今日 · ${date.getMonth() + 1}月${date.getDate()}日`
}
