import request from '@/utils/request'

export interface Macros {
  protein: number
  fat: number
  carbs: number
}

export interface Summary {
  bmi: number
  status: string
  caloriesTarget: number
  activityFactor?: number
  tdee?: number
  goal: string
  keyMessage: string
  reasons?: string[]
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  title: string
  menu: string
  calories: number
  macros: Macros
  advice: string
  reasons?: string[]
  locked?: boolean
}

export interface DailyStats {
  totalCalories: number
  totalMacros: Macros
  pfcRatio: Macros
  summaryText: string
  reasons?: string[]
}

export interface RefreshInfo {
  refreshed: boolean
  lockedMeals: string[]
  message: string
}

export interface RecommendData {
  date: string
  summary: Summary
  meals: Meal[]
  dailySummary: DailyStats
  extraAdvice: string[]
  refreshInfo?: RefreshInfo
}

export const getTodayRecommendAPI = (userId: number) => {
  return request<RecommendData>({
    url: '/recommend/today',
    method: 'get',
    params: { userId },
    timeout: 0
  })
}

export const refreshTodayRecommendAPI = (userId: number) => {
  return request<RecommendData>({
    url: '/recommend/refresh',
    method: 'post',
    params: { userId },
    timeout: 0
  })
}
