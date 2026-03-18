export interface BodyStatusMeta {
  text: string
  level: string
}

const goalLabelMap: Record<string, string> = {
  lose_fat: '减脂管理',
  maintain: '维持体重',
  gain_muscle: '增肌强化',
  diabetes_control: '控糖饮食',
  hypertension_control: '控压饮食',
  hyperlipidemia_control: '控脂饮食'
}

const bodyStatusMap: Record<string, BodyStatusMeta> = {
  underweight: { text: '偏瘦', level: 'normal' },
  normal: { text: '正常', level: 'good' },
  overweight: { text: '超重', level: 'warn' },
  obese: { text: '肥胖', level: 'warn' }
}

export const toNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

export const toPercent = (value: unknown) => {
  const raw = toNumber(value)
  const percent = raw <= 1 ? raw * 100 : raw
  return Number(percent.toFixed(1))
}

export const resolveGoalLabel = (goal?: string | null) => {
  return goalLabelMap[goal || ''] || '个性化目标'
}

export const resolveBodyStatus = (status?: string | null): BodyStatusMeta => {
  return bodyStatusMap[status || ''] || { text: '待评估', level: 'pending' }
}
