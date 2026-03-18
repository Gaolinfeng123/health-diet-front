import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getTodayRecommendAPI, refreshTodayRecommendAPI } from '@/api/recommend'
import type { Meal, RecommendData } from '@/api/recommend'
import { getLocalDateString } from '@/utils/date'
import { resolveBodyStatus, resolveGoalLabel, toNumber, toPercent } from '@/utils/health'
import type { BodyStatusMeta } from '@/utils/health'
import { useUserIdentity } from '@/composables/useUserIdentity'
import { consumeRecommendRefreshNeeded } from '@/utils/recommendSync'

export interface PfcItem {
  key: string
  label: string
  percent: number
  amount: number
  color: string
}

export interface MealMeta {
  label: string
  accent: string
  chip: string
}

export type MealCard = Meal & {
  meta: MealMeta
}

const mealMetaMap: Record<string, MealMeta> = {
  breakfast: { label: '早餐启动', accent: '#f59e0b', chip: '07:00-09:00' },
  lunch: { label: '午间续航', accent: '#fb7185', chip: '11:30-13:30' },
  dinner: { label: '晚间收束', accent: '#f97316', chip: '17:30-19:30' },
  snack: { label: '按需加餐', accent: '#14b8a6', chip: '灵活补充' }
}

const mealTypeLabelMap: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

const localizeRefreshMessage = (message?: string) => {
  if (!message) return ''

  const normalized = message.toLowerCase()
  if (normalized.includes('generated')) return '今日推荐已生成。'
  if (normalized.includes('refreshed') && normalized.includes('locked')) {
    return '今日推荐已刷新，已进食餐次会自动锁定保留。'
  }
  if (normalized.includes('refreshed')) return '今日推荐已刷新。'

  return message
    .replace(/today's recommendation/gi, '今日推荐')
    .replace(/refreshed/gi, '已刷新')
    .replace(/generated/gi, '已生成')
    .replace(/keeping consumed meals locked/gi, '并保留已进食餐次')
    .replace(/consumed meals locked/gi, '已进食餐次已锁定')
}

const extractErrorMessage = (error: unknown, fallback: string) => {
  const message =
    (error as any)?.msg ||
    (error as any)?.message ||
    (error as any)?.response?.data?.msg ||
    (error as any)?.response?.data?.message

  if (!message || message === 'canceled') return fallback
  if (typeof message === 'string' && message.includes('timeout')) {
    return '推荐生成时间较长，请稍候，或稍后重试。'
  }
  return String(message)
}

export const useRecommend = () => {
  const loading = ref(false)
  const refreshing = ref(false)
  const loadingText = ref('正在读取你的健康档案...')
  const recommendData = ref<RecommendData | null>(null)
  const recommendDate = ref(getLocalDateString())
  const { resolveUserId } = useUserIdentity()
  let loadingTimer: ReturnType<typeof setInterval> | null = null

  const startLoadingText = () => {
    const steps = [
      '正在读取你的健康档案...',
      '正在计算今日轨迹总热量...',
      '正在生成更适合你的餐次搭配...',
      '正在整理推荐理由与营养结构...'
    ]

    let stepIndex = 0
    loadingText.value = steps[0]

    if (loadingTimer) clearInterval(loadingTimer)
    loadingTimer = setInterval(() => {
      stepIndex = (stepIndex + 1) % steps.length
      loadingText.value = steps[stepIndex]
    }, 2200)
  }

  const stopLoadingText = () => {
    if (loadingTimer) {
      clearInterval(loadingTimer)
      loadingTimer = null
    }
  }

  const applyRecommend = (data: RecommendData | null | undefined) => {
    recommendData.value = data || null
  }

  const loadRecommend = async (
    mode: 'load' | 'refresh' = 'load',
    options?: { userId?: number; silentSuccess?: boolean }
  ) => {
    if (mode === 'refresh') {
      refreshing.value = true
      if (!recommendData.value) {
        loading.value = true
        startLoadingText()
      }
    } else {
      loading.value = true
      startLoadingText()
    }

    try {
      const userId = options?.userId || await resolveUserId()
      if (!userId) {
        ElMessage.warning(`未找到用户信息，暂时无法${mode === 'refresh' ? '刷新' : '加载'}今日推荐`)
        return
      }

      recommendDate.value = getLocalDateString()
      const response = mode === 'refresh'
        ? await refreshTodayRecommendAPI(userId)
        : await getTodayRecommendAPI(userId)

      applyRecommend(response.data)

      if (
        mode === 'refresh' &&
        !options?.silentSuccess &&
        response.data?.refreshInfo?.message
      ) {
        ElMessage.success(localizeRefreshMessage(response.data.refreshInfo.message))
      }
    } catch (error) {
      const fallback = `${mode === 'refresh' ? '刷新' : '加载'}今日推荐失败，请稍后重试`
      ElMessage.error(extractErrorMessage(error, fallback))
    } finally {
      refreshing.value = false
      stopLoadingText()
      loading.value = false
    }
  }

  const initRecommend = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      ElMessage.warning('未找到用户信息，暂时无法加载今日推荐')
      return
    }

    const shouldRefresh = consumeRecommendRefreshNeeded(userId)
    await loadRecommend(shouldRefresh ? 'refresh' : 'load', {
      userId,
      silentSuccess: shouldRefresh
    })
  }

  const summary = computed(() => recommendData.value?.summary || null)
  const dailySummary = computed(() => recommendData.value?.dailySummary || null)
  const meals = computed(() => recommendData.value?.meals || [])
  const extraAdvice = computed(() => recommendData.value?.extraAdvice || [])
  const summaryReasons = computed(() => recommendData.value?.summary?.reasons || [])
  const dailyReasons = computed(() => recommendData.value?.dailySummary?.reasons || [])

  const refreshInfo = computed(() => {
    const raw = recommendData.value?.refreshInfo
    if (!raw) return null

    return {
      ...raw,
      message: localizeRefreshMessage(raw.message),
      lockedMeals: Array.from(
        new Set((raw.lockedMeals || []).map((meal) => mealTypeLabelMap[meal] || meal))
      )
    }
  })

  const reportDateLabel = computed(() => recommendData.value?.date || recommendDate.value)

  const summaryTextFormatted = computed(() => {
    const raw = dailySummary.value?.summaryText || '暂无总结'
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n\r?\n/g, '<br><br>')
      .replace(/\r?\n/g, '<br>')
  })

  const goalLabel = computed(() => resolveGoalLabel(summary.value?.goal))
  const bodyStatus = computed<BodyStatusMeta>(() => resolveBodyStatus(summary.value?.status))

  const pfcItems = computed<PfcItem[]>(() => {
    const ratio = dailySummary.value?.pfcRatio || { protein: 0, fat: 0, carbs: 0 }
    const totalMacros = dailySummary.value?.totalMacros || { protein: 0, fat: 0, carbs: 0 }

    return [
      {
        key: 'protein',
        label: '蛋白质',
        percent: toPercent(ratio.protein),
        amount: toNumber(totalMacros.protein),
        color: '#ff9838'
      },
      {
        key: 'fat',
        label: '脂肪',
        percent: toPercent(ratio.fat),
        amount: toNumber(totalMacros.fat),
        color: '#fb7185'
      },
      {
        key: 'carbs',
        label: '碳水',
        percent: toPercent(ratio.carbs),
        amount: toNumber(totalMacros.carbs),
        color: '#f59e0b'
      }
    ]
  })

  const mealCards = computed<MealCard[]>(() => {
    return meals.value.map((meal, index) => ({
      ...meal,
      meta: mealMetaMap[meal.type] || {
        label: `餐次 ${index + 1}`,
        accent: '#f97316',
        chip: '灵活安排'
      }
    })) as MealCard[]
  })

  onMounted(() => {
    initRecommend()
  })

  onBeforeUnmount(() => {
    stopLoadingText()
  })

  return {
    bodyStatus,
    dailySummary,
    dailyReasons,
    extraAdvice,
    goalLabel,
    loading,
    loadingText,
    mealCards,
    pfcItems,
    recommendData,
    reportDateLabel,
    refreshInfo,
    refreshing,
    summary,
    summaryReasons,
    summaryTextFormatted,
    refreshRecommend: () => loadRecommend('refresh'),
    toNumber
  }
}
