import request from '@/utils/request'

// 推荐数据结构定义
export interface Macros {
  protein: number;
  fat: number;
  carbs: number;
}

export interface Summary {
  bmi: number;
  status: string;
  caloriesTarget: number;
  goal: string;
  keyMessage: string;
}

export interface Meal {
  type: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  menu: string;
  calories: number;
  macros: Macros;
  advice: string;
}

export interface DailyStats {
  totalCalories: number;
  totalMacros: Macros;
  pfcRatio: Macros;
  summaryText: string;
}

export interface RecommendData {
  date: string;
  summary: Summary;
  meals: Meal[];
  dailySummary: DailyStats;
  extraAdvice: string[];
}

// 获取推荐，默认今日；支持按 date 查询
export const getTodayRecommendAPI = (userId: number, date?: string) => {
    return request<RecommendData>({
        url: '/recommend/today',
        method: 'get',
        params: date ? { userId, date } : { userId } // 后端按 userId/date 查询推荐数据
    })
}

