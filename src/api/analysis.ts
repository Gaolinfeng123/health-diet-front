import request from '@/utils/request'

export interface AnalysisReportParams {
  userId?: number
  date: string
}

export interface AnalysisTrendParams {
  userId?: number
  days?: number
}

export interface MacroAmount {
  protein?: number | null
  fat?: number | null
  carbs?: number | null
  carb?: number | null
}

export interface MacroRatio {
  protein?: number | null
  fat?: number | null
  carbs?: number | null
  carb?: number | null
}

export interface EnergyAssessment {
  actual?: number | null
  target?: number | null
  diff?: number | null
  status?: string | null
  comment?: string | null
}

export interface NutrientAssessment {
  nutrient?: string | null
  actual?: number | null
  target?: number | null
  diff?: number | null
  status?: string | null
  comment?: string | null
}

export interface MealAssessment {
  type?: string | null
  title?: string | null
  calories?: number | null
  targetCalories?: number | null
  share?: number | null
  status?: string | null
  comment?: string | null
}

export interface AnalysisTrendPoint {
  date?: string | null
  day?: string | null
  statDate?: string | null
  calories?: number | null
  totalCalories?: number | null
  value?: number | null
}

export interface AnalysisTrendData {
  points?: AnalysisTrendPoint[]
  records?: AnalysisTrendPoint[]
  list?: AnalysisTrendPoint[]
  trend?: AnalysisTrendPoint[]
}

export interface AnalysisReport {
  reportTitle?: string | null
  overview?: string | null
  advice?: string | string[] | null
  activityFactor?: number | null
  tdee?: number | null
  summary?: {
    activityFactor?: number | null
    tdee?: number | null
  } | null
  analysisDate?: string | null
  date?: string | null
  bmi?: number | null
  status?: string | null
  goal?: string | null
  recommendCalories?: number | null
  targetCalories?: number | null
  caloriesTarget?: number | null
  totalCalories?: number | null
  actualCalories?: number | null
  diff?: number | null
  calorieDiff?: number | null
  energyAssessment?: EnergyAssessment | null
  totalProtein?: number | null
  totalFat?: number | null
  totalCarb?: number | null
  targetProtein?: number | null
  targetFat?: number | null
  targetCarb?: number | null
  actualMacros?: MacroAmount | null
  targetMacros?: MacroAmount | null
  actualPfcRatio?: MacroRatio | null
  targetPfcRatio?: MacroRatio | null
  actualPfc?: MacroRatio | null
  targetPfc?: MacroRatio | null
  nutrientAssessments?: NutrientAssessment[] | null
  breakfastCal?: number | null
  lunchCal?: number | null
  dinnerCal?: number | null
  snackCal?: number | null
  mealAssessments?: MealAssessment[] | null
  highlights?: string[] | string | null
  suggestions?: string[] | string | null
  quickQuestions?: string[] | null
  mealCalories?: Record<string, number> | null
  mealDistribution?: Record<string, number> | null
  mealRatios?: Record<string, number> | null
}

export const getAnalysisReportAPI = (params: AnalysisReportParams) => {
  return request<AnalysisReport>({
    url: '/analysis/report',
    method: 'get',
    params,
    timeout: 0
  })
}

export const getAnalysisTrendAPI = (params: AnalysisTrendParams) => {
  return request<AnalysisTrendData>({
    url: '/analysis/trend',
    method: 'get',
    params,
    timeout: 0
  })
}
