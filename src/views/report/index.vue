<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getAnalysisReportAPI,
  type AnalysisReport,
  type MacroRatio,
  type MealAssessment,
  type NutrientAssessment
} from '@/api/analysis'
import { ElMessage } from 'element-plus'
import {
  DataLine,
  ForkSpoon,
  Opportunity,
  Reading,
  Sunny,
  Trophy
} from '@element-plus/icons-vue'
import { getLocalDateOffsetString } from '@/utils/date'
import { toNumber, toPercent } from '@/utils/health'
import { useUserIdentity } from '@/composables/useUserIdentity'

type StatusTone = 'good' | 'warn' | 'low' | 'pending'

interface StatusMeta {
  text: string
  level: StatusTone
}

interface EnergyCardData {
  actual: number
  target: number
  diff: number
  status: string
  comment: string
}

interface NutrientCard {
  label: string
  actual: number
  target: number
  diff: number
  status: string
  comment: string
  tone: StatusTone
  completion: number
}

interface RatioSegment {
  label: string
  value: number
  color: string
}

interface RatioRow {
  label: string
  caption: string
  segments: RatioSegment[]
}

interface RatioCompareRow {
  label: string
  actual: number
  target: number
  diff: number
  diffText: string
  tone: StatusTone
  color: string
}

interface MealCard {
  key: string
  title: string
  calories: number
  targetCalories: number
  share: number
  delta: number
  deltaText: string
  status: string
  comment: string
  tone: StatusTone
  actualWidth: number
  targetMarker: number
}

const loading = ref(false)
const refreshing = ref(false)
const analysisData = ref<AnalysisReport | null>(null)
const reportDate = ref(getLocalDateOffsetString(-1))
const { resolveUserId } = useUserIdentity()
const router = useRouter()

const buildReportCacheKey = (userId: number, date: string) => `analysis-report:${userId}:${date}`

const readReportCache = (key: string) => {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AnalysisReport
  } catch {
    if (analysisData.value) return
    sessionStorage.removeItem(key)
    return null
  }
}

const writeReportCache = (key: string, value: AnalysisReport) => {
  sessionStorage.setItem(key, JSON.stringify(value))
}

const goalLabelMap: Record<string, string> = {
  lose_fat: '减脂管理',
  maintain: '维持体重',
  gain_muscle: '增肌强化',
  diabetes_control: '控糖饮食',
  hypertension_control: '控压饮食',
  hyperlipidemia_control: '控脂饮食'
}

const bodyStatusMap: Record<string, StatusMeta> = {
  underweight: { text: '偏瘦', level: 'low' },
  normal: { text: '正常', level: 'good' },
  overweight: { text: '超重', level: 'warn' },
  obese: { text: '肥胖', level: 'warn' }
}

const mealTitleMap: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

const nutrientLabelMap: Record<string, string> = {
  protein: '蛋白质',
  fat: '脂肪',
  carbs: '碳水',
  carb: '碳水',
  carbohydrate: '碳水'
}

const ratioPalette = {
  protein: '#f97316',
  fat: '#fb7185',
  carbs: '#f59e0b'
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map(item => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\r?\n|[；;]+/).map(item => item.trim()).filter(Boolean)
  }
  return []
}

const normalizeRatio = (value?: MacroRatio | null) => ({
  protein: toPercent(value?.protein),
  fat: toPercent(value?.fat),
  carbs: toPercent(value?.carbs ?? value?.carb)
})

const resolveTone = (status: string): StatusTone => {
  if (/达标|正常|合理|稳定|已安排/.test(status)) return 'good'
  if (/偏高|过高|超出|偏多/.test(status)) return 'warn'
  if (/偏低|不足|偏少|缺乏/.test(status)) return 'low'
  return 'pending'
}

const resolveNutrientLabel = (value?: string | null) => {
  const raw = String(value || '').trim()
  if (!raw) return '营养素'
  return nutrientLabelMap[raw.toLowerCase()] || raw
}

const resolveMealTitle = (type?: string | null, title?: string | null) => {
  const normalizedTitle = String(title || '').trim()
  if (normalizedTitle) return normalizedTitle
  return mealTitleMap[String(type || '').trim()] || '餐次'
}

const buildCompletion = (actual: number, target: number) => {
  if (target <= 0) return actual > 0 ? 100 : 0
  return Number(clamp((actual / target) * 100, 0, 180).toFixed(1))
}

const buildTrackMarkerPosition = (value: number, scaleMax: number) => {
  if (value <= 0 || scaleMax <= 0) return 0
  const percent = (value / scaleMax) * 100
  return Number(clamp(percent, 6, 94).toFixed(1))
}

const deriveAssessmentStatus = (diff: number, target: number) => {
  if (!target && !diff) return '待评估'
  if (Math.abs(diff) <= Math.max(target * 0.1, 5)) return '达标'
  return diff > 0 ? '偏高' : '偏低'
}

const deriveEnergyComment = (diff: number, status: string) => {
  if (status === '达标') return '当天总热量与目标较接近，整体控制比较稳定。'
  if (diff > 0) return '当天总热量偏高，可适当关注主食和油脂的收紧。'
  return '当天总热量偏低，可留意优质蛋白和主食补充。'
}

const deriveMealComment = (title: string, diff: number, targetCalories: number) => {
  if (!targetCalories) return `${title}热量已记录，可结合全天总量一起观察。`
  if (Math.abs(diff) <= Math.max(targetCalories * 0.12, 30)) return `${title}供能与建议值较接近。`
  if (diff > 0) return `${title}供能略高，可适当减少高油脂或高糖搭配。`
  return `${title}供能偏少，可补充主食或蛋白质来源。`
}

const normalizeMealComment = (
  title: string,
  rawComment: string,
  diff: number,
  targetCalories: number
) => {
  const text = rawComment.trim()
  if (!text) return deriveMealComment(title, diff, targetCalories)

  if (title === '加餐') {
    if (/主餐之外还有补充摄入|存在加餐记录|补充摄入/.test(text)) {
      if (!targetCalories) return '加餐已计入全天摄入，可结合总热量判断是否需要继续控制。'
      if (Math.abs(diff) <= Math.max(targetCalories * 0.15, 25)) return '这次加餐基本落在建议区间，更多是用来补足全天缺口。'
      if (diff > 0) return '这次加餐已经明显抬高全天热量，后续更适合控制份量或换成轻量补给。'
      return '这次加餐已纳入全天计划，但补得还不够时可优先补蛋白或低糖主食。'
    }

    if (/未安排/.test(text)) {
      return '当天没有明显加餐，全天缺口主要由三餐承担。'
    }
  }

  return text
}

const buildRatioSegments = (ratio: { protein: number; fat: number; carbs: number }): RatioSegment[] => [
  { label: '蛋白质', value: ratio.protein, color: ratioPalette.protein },
  { label: '脂肪', value: ratio.fat, color: ratioPalette.fat },
  { label: '碳水', value: ratio.carbs, color: ratioPalette.carbs }
]

const loadReport = async () => {
  try {
    const userId = await resolveUserId()
    if (!userId) {
      ElMessage.warning('未找到用户信息，暂时无法加载分析报告')
      return
    }
    const date = getLocalDateOffsetString(-1)
    reportDate.value = date
    const cacheKey = buildReportCacheKey(userId, date)
    const cached = readReportCache(cacheKey)

    if (cached) {
      analysisData.value = cached
      refreshing.value = true
    } else {
      loading.value = true
    }

    const res = await getAnalysisReportAPI({ userId, date })
    analysisData.value = res.data || null
    if (res.data) {
      writeReportCache(cacheKey, res.data)
    }
  } catch {
    ElMessage.error('加载分析报告失败，请稍后重试')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const hasReport = computed(() => Boolean(analysisData.value))
const reportDateLabel = computed(() => analysisData.value?.analysisDate || analysisData.value?.date || reportDate.value)
const reportTitle = computed(() => analysisData.value?.reportTitle || `${reportDateLabel.value} 饮食分析报告`)
const overview = computed(() => {
  return (
    String(analysisData.value?.overview || '').trim() ||
    String(analysisData.value?.energyAssessment?.comment || '').trim() ||
    normalizeList(analysisData.value?.highlights)[0] ||
    '系统已根据当天饮食记录生成分析结果。'
  )
})

const adviceText = computed(() => {
  if (typeof analysisData.value?.advice === 'string' && analysisData.value.advice.trim()) {
    return analysisData.value.advice.trim()
  }
  return normalizeList(analysisData.value?.advice)[0] || '继续保持饮食记录，系统会提供更稳定的分析建议。'
})

const goalLabel = computed(() => goalLabelMap[String(analysisData.value?.goal || '')] || '个性化目标')
const bodyStatus = computed<StatusMeta>(() => bodyStatusMap[String(analysisData.value?.status || '')] || { text: '待评估', level: 'pending' })
const bmiValue = computed(() => Number(toNumber(analysisData.value?.bmi).toFixed(1)))

const activityFactor = computed(() => {
  const value = toNumber(analysisData.value?.activityFactor ?? analysisData.value?.summary?.activityFactor)
  return value > 0 ? value.toFixed(2) : '--'
})

const tdeeValue = computed(() => {
  const value = Math.round(toNumber(analysisData.value?.tdee ?? analysisData.value?.summary?.tdee))
  return value > 0 ? `${value} kcal` : '--'
})

const recommendCalories = computed(() => {
  return Math.round(toNumber(
    analysisData.value?.recommendCalories ??
    analysisData.value?.targetCalories ??
    analysisData.value?.caloriesTarget ??
    analysisData.value?.energyAssessment?.target
  ))
})

const actualCalories = computed(() => {
  return Math.round(toNumber(
    analysisData.value?.totalCalories ??
    analysisData.value?.actualCalories ??
    analysisData.value?.energyAssessment?.actual
  ))
})

const diffCalories = computed(() => {
  const raw = analysisData.value?.diff ?? analysisData.value?.calorieDiff ?? analysisData.value?.energyAssessment?.diff
  if (raw != null) return Math.round(toNumber(raw))
  return actualCalories.value - recommendCalories.value
})

const energyAssessment = computed<EnergyCardData>(() => {
  const source = analysisData.value?.energyAssessment
  const actual = Math.round(toNumber(source?.actual ?? actualCalories.value))
  const target = Math.round(toNumber(source?.target ?? recommendCalories.value))
  const diff = Math.round(toNumber(source?.diff ?? diffCalories.value))
  const status = String(source?.status || '').trim() || deriveAssessmentStatus(diff, target)
  const comment = String(source?.comment || '').trim() || deriveEnergyComment(diff, status)
  return { actual, target, diff, status, comment }
})

const calorieCompletion = computed(() => Math.round(buildCompletion(energyAssessment.value.actual, energyAssessment.value.target)))
const calorieRingStyle = computed(() => {
  const fill = clamp(calorieCompletion.value, 0, 100)
  return { background: `conic-gradient(#f97316 0 ${fill}%, rgba(253, 186, 116, 0.18) ${fill}% 100%)` }
})

const energyScaleMax = computed(() => Math.max(energyAssessment.value.actual, energyAssessment.value.target, 1))
const energyBars = computed(() => [
  {
    label: '目标热量',
    value: energyAssessment.value.target,
    width: Number(((energyAssessment.value.target / energyScaleMax.value) * 100).toFixed(1)),
    barClass: 'target'
  },
  {
    label: '实际热量',
    value: energyAssessment.value.actual,
    width: Number(((energyAssessment.value.actual / energyScaleMax.value) * 100).toFixed(1)),
    barClass: resolveTone(energyAssessment.value.status)
  }
])

const summaryMeta = computed(() => [
  { label: '分析日期', value: reportDateLabel.value, tone: 'pending' as StatusTone },
  { label: '身体状态', value: bodyStatus.value.text, tone: bodyStatus.value.level },
  { label: 'BMI', value: bmiValue.value ? bmiValue.value.toFixed(1) : '--', tone: 'pending' as StatusTone },
  { label: '活动系数', value: activityFactor.value, tone: 'pending' as StatusTone },
  { label: 'TDEE', value: tdeeValue.value, tone: 'pending' as StatusTone },
  { label: '推荐热量', value: recommendCalories.value ? `${recommendCalories.value} kcal` : '--', tone: 'good' as StatusTone }
])

const energyStats = computed(() => [
  { label: '实际摄入', value: `${energyAssessment.value.actual} kcal` },
  { label: '目标摄入', value: `${energyAssessment.value.target} kcal` },
  { label: '差值', value: `${energyAssessment.value.diff > 0 ? '+' : ''}${energyAssessment.value.diff} kcal` },
  { label: '状态', value: energyAssessment.value.status }
])

const actualPfc = computed(() => normalizeRatio(analysisData.value?.actualPfcRatio ?? analysisData.value?.actualPfc))
const targetPfc = computed(() => normalizeRatio(analysisData.value?.targetPfcRatio ?? analysisData.value?.targetPfc))

const nutrientCards = computed<NutrientCard[]>(() => {
  const assessments = Array.isArray(analysisData.value?.nutrientAssessments) ? analysisData.value?.nutrientAssessments : []
  if (assessments.length) {
    return assessments.map((item: NutrientAssessment) => {
      const actual = Number(toNumber(item.actual).toFixed(1))
      const target = Number(toNumber(item.target).toFixed(1))
      const diff = Number(toNumber(item.diff ?? actual - target).toFixed(1))
      const status = String(item.status || '').trim() || deriveAssessmentStatus(diff, target)
      return {
        label: resolveNutrientLabel(item.nutrient),
        actual,
        target,
        diff,
        status,
        comment: String(item.comment || '').trim() || `${resolveNutrientLabel(item.nutrient)}摄入情况已生成评估。`,
        tone: resolveTone(status),
        completion: buildCompletion(actual, target)
      }
    })
  }

  return [
    {
      label: '蛋白质',
      actual: toNumber(analysisData.value?.totalProtein ?? analysisData.value?.actualMacros?.protein),
      target: toNumber(analysisData.value?.targetProtein ?? analysisData.value?.targetMacros?.protein)
    },
    {
      label: '脂肪',
      actual: toNumber(analysisData.value?.totalFat ?? analysisData.value?.actualMacros?.fat),
      target: toNumber(analysisData.value?.targetFat ?? analysisData.value?.targetMacros?.fat)
    },
    {
      label: '碳水',
      actual: toNumber(analysisData.value?.totalCarb ?? analysisData.value?.actualMacros?.carbs ?? analysisData.value?.actualMacros?.carb),
      target: toNumber(analysisData.value?.targetCarb ?? analysisData.value?.targetMacros?.carbs ?? analysisData.value?.targetMacros?.carb)
    }
  ]
    .filter(item => item.actual > 0 || item.target > 0)
    .map(item => {
      const actual = Number(item.actual.toFixed(1))
      const target = Number(item.target.toFixed(1))
      const diff = Number((actual - target).toFixed(1))
      const status = deriveAssessmentStatus(diff, target)
      return {
        label: item.label,
        actual,
        target,
        diff,
        status,
        comment: `${item.label}摄入与建议值的对比已完成。`,
        tone: resolveTone(status),
        completion: buildCompletion(actual, target)
      }
    })
})

const ratioRows = computed<RatioRow[]>(() => [
  { label: '目标配比', caption: '系统建议的供能结构', segments: buildRatioSegments(targetPfc.value) },
  { label: '实际配比', caption: '昨日实际摄入结构', segments: buildRatioSegments(actualPfc.value) }
])

const ratioLegend = computed(() => buildRatioSegments({ protein: 0, fat: 0, carbs: 0 }))

const ratioCompareRows = computed<RatioCompareRow[]>(() => {
  const items = [
    { label: '蛋白质', actual: actualPfc.value.protein, target: targetPfc.value.protein, color: ratioPalette.protein },
    { label: '脂肪', actual: actualPfc.value.fat, target: targetPfc.value.fat, color: ratioPalette.fat },
    { label: '碳水', actual: actualPfc.value.carbs, target: targetPfc.value.carbs, color: ratioPalette.carbs }
  ]

  return items.map(item => {
    const diff = Number((item.actual - item.target).toFixed(1))
    const tone = resolveTone(deriveAssessmentStatus(diff, item.target))
    return {
      ...item,
      diff,
      diffText: `${diff > 0 ? '+' : ''}${diff}%`,
      tone
    }
  })
})

const mealCards = computed<MealCard[]>(() => {
  const assessments = Array.isArray(analysisData.value?.mealAssessments) ? analysisData.value?.mealAssessments : []
  const baseCards = assessments.length
    ? assessments.map((item: MealAssessment, index: number) => {
      const calories = Math.round(toNumber(item.calories))
      const targetCalories = Math.round(toNumber(item.targetCalories))
      const share = toPercent(item.share)
      const diff = calories - targetCalories
      const title = resolveMealTitle(item.type, item.title)
      const status = String(item.status || '').trim() || deriveAssessmentStatus(diff, targetCalories)
      return {
        key: `${item.type || 'meal'}-${index}`,
        title,
        calories,
        targetCalories,
        share,
        delta: diff,
        deltaText: `${diff > 0 ? '+' : ''}${diff} kcal`,
        status,
        comment: normalizeMealComment(title, String(item.comment || ''), diff, targetCalories),
        tone: resolveTone(status)
      }
    })
    : [
      { key: 'breakfast', title: '早餐', calories: Math.round(toNumber(analysisData.value?.breakfastCal)), targetCalories: Math.round(recommendCalories.value * 0.3) },
      { key: 'lunch', title: '午餐', calories: Math.round(toNumber(analysisData.value?.lunchCal)), targetCalories: Math.round(recommendCalories.value * 0.4) },
      { key: 'dinner', title: '晚餐', calories: Math.round(toNumber(analysisData.value?.dinnerCal)), targetCalories: Math.round(recommendCalories.value * 0.3) },
      { key: 'snack', title: '加餐', calories: Math.round(toNumber(analysisData.value?.snackCal)), targetCalories: Math.round(recommendCalories.value * 0.1) }
    ]
      .filter(item => item.calories > 0)
      .map(item => {
        const diff = item.calories - item.targetCalories
        const status = deriveAssessmentStatus(diff, item.targetCalories)
        return {
          ...item,
          share: toPercent(item.calories / Math.max(actualCalories.value, 1)),
          delta: diff,
          deltaText: `${diff > 0 ? '+' : ''}${diff} kcal`,
          status,
          comment: deriveMealComment(item.title, diff, item.targetCalories),
          tone: resolveTone(status)
        }
      })

  const scaleMax = Math.max(...baseCards.map(item => Math.max(item.calories, item.targetCalories)), 1)
  return baseCards.map(item => ({
    ...item,
    actualWidth: Number(((item.calories / scaleMax) * 100).toFixed(1)),
    targetMarker: buildTrackMarkerPosition(item.targetCalories, scaleMax)
  }))
})

const highlights = computed(() => {
  const list = normalizeList(analysisData.value?.highlights)
  if (list.length) return list
  return [
    String(analysisData.value?.overview || '').trim(),
    String(analysisData.value?.energyAssessment?.comment || '').trim(),
    ...nutrientCards.value.filter(item => item.status !== '达标').map(item => `${item.label}：${item.comment}`),
    ...mealCards.value.filter(item => item.status !== '合理').map(item => `${item.title}：${item.comment}`)
  ].filter(Boolean).slice(0, 4)
})

const suggestions = computed(() => {
  const list = normalizeList(analysisData.value?.suggestions)
  if (list.length) return list.slice(0, 4)
  return normalizeList(analysisData.value?.advice).slice(0, 4)
})

const quickQuestions = computed(() => {
  const list = Array.isArray(analysisData.value?.quickQuestions)
    ? analysisData.value?.quickQuestions.map(item => String(item || '').trim()).filter(Boolean)
    : []
  return list.slice(0, 5)
})

const askQuickQuestion = (question: string) => {
  const content = question.trim()
  if (!content) return

  router.push({
    path: '/chat',
    query: {
      q: content,
      from: 'report',
      ts: String(Date.now())
    }
  })
}

onMounted(() => {
  loadReport()
})
</script>

<template>
  <div
    class="report-container"
    v-loading="loading && !hasReport"
    element-loading-text="正在生成分析报告..."
    element-loading-background="rgba(255, 255, 255, 0.72)"
  >
    <el-card class="glass-effect hero-card">
      <div v-if="hasReport" class="hero-layout">
        <div class="hero-main">
          <div class="hero-kicker">昨日饮食复盘</div>
          <div class="hero-head">
            <h2>{{ reportTitle }}</h2>
            <div class="goal-tag">{{ goalLabel }}</div>
          </div>
          <div v-if="refreshing" class="report-sync-tip">正在后台同步最新分析内容...</div>
          <p class="hero-overview">{{ overview }}</p>
          <div class="advice-box">
            <span>一句结论</span>
            <p>{{ adviceText }}</p>
          </div>
        </div>

        <div class="meta-grid">
          <div v-for="item in summaryMeta" :key="item.label" class="meta-item" :class="item.tone">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>
      <el-empty v-else description="暂无分析报告" :image-size="90" />
    </el-card>

    <el-row :gutter="20" class="section-row">
      <el-col :span="24">
        <el-card class="glass-effect section-card">
          <template #header>
            <div class="section-title">
              <el-icon><DataLine /></el-icon>
              <span>热量与目标</span>
            </div>
          </template>

          <div v-if="hasReport" class="energy-layout">
            <div class="energy-ring-card">
              <div class="energy-ring" :style="calorieRingStyle">
                <div class="energy-ring-inner">
                  <span>达成度</span>
                  <strong>{{ calorieCompletion }}%</strong>
                  <small>{{ energyAssessment.status }}</small>
                </div>
              </div>
              <div class="energy-ring-caption">
                <strong>昨日热量完成情况</strong>
                <p>先看总量是否接近目标，再决定是否继续关注宏量营养和分餐问题。</p>
              </div>
            </div>

            <div class="energy-panel">
              <div class="energy-grid">
                <div v-for="item in energyStats" :key="item.label" class="metric-card">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>

              <div class="energy-bars">
                <div v-for="item in energyBars" :key="item.label" class="energy-bar-row">
                  <div class="energy-bar-head">
                    <span>{{ item.label }}</span>
                    <b>{{ item.value }} kcal</b>
                  </div>
                  <div class="energy-bar-track">
                    <div class="energy-bar-fill" :class="item.barClass" :style="{ width: `${item.width}%` }"></div>
                  </div>
                </div>
                <div class="energy-bar-note">条形长度按两者较大值缩放，能更直观看到偏高或偏低。</div>
              </div>

              <div class="energy-comment" :class="resolveTone(energyAssessment.status)">
                <div class="comment-label">热量结论</div>
                <p>{{ energyAssessment.comment }}</p>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无热量分析数据" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="section-row">
      <el-col :xs="24" :sm="24" :lg="14">
        <el-card class="glass-effect section-card full-height">
          <template #header>
            <div class="section-title">
              <el-icon><Sunny /></el-icon>
              <span>宏量营养分析</span>
            </div>
          </template>

          <div v-if="nutrientCards.length" class="nutrient-grid">
            <div v-for="item in nutrientCards" :key="item.label" class="nutrient-card" :class="item.tone">
              <div class="nutrient-head">
                <strong>{{ item.label }}</strong>
                <span class="state-pill" :class="item.tone">{{ item.status }}</span>
              </div>
              <div class="nutrient-values">
                <div><span>实际摄入</span><b>{{ item.actual }} g</b></div>
                <div><span>目标摄入</span><b>{{ item.target }} g</b></div>
                <div><span>差值</span><b>{{ item.diff > 0 ? '+' : '' }}{{ item.diff }} g</b></div>
              </div>
              <div class="progress-block">
                <div class="progress-head">
                  <span>达成率</span>
                  <b>{{ item.completion }}%</b>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :class="item.tone" :style="{ width: `${item.completion}%` }"></div>
                </div>
              </div>
              <p>{{ item.comment }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无营养结构分析" :image-size="70" />
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :lg="10">
        <el-card class="glass-effect section-card full-height">
          <template #header>
            <div class="section-title">
              <el-icon><Reading /></el-icon>
              <span>P/F/C 供能占比</span>
            </div>
          </template>

          <div class="ratio-panel">
            <div class="ratio-legend">
              <div v-for="item in ratioLegend" :key="item.label" class="ratio-legend-item">
                <span class="ratio-dot" :style="{ backgroundColor: item.color }"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>

            <div v-for="row in ratioRows" :key="row.label" class="ratio-card">
              <div class="ratio-header">
                <strong>{{ row.label }}</strong>
                <span>{{ row.caption }}</span>
              </div>
              <div class="ratio-stack">
                <div
                  v-for="segment in row.segments"
                  :key="`${row.label}-${segment.label}`"
                  class="ratio-segment"
                  :style="{ width: `${segment.value}%`, backgroundColor: segment.color }"
                >
                  <span v-if="segment.value >= 14">{{ segment.value }}%</span>
                </div>
              </div>
              <div class="ratio-values">
                <span v-for="segment in row.segments" :key="`${row.label}-${segment.label}-value`">{{ segment.label }} {{ segment.value }}%</span>
              </div>
            </div>

            <div class="ratio-compare-card">
              <div class="ratio-compare-title">结构偏差速览</div>
              <div v-for="item in ratioCompareRows" :key="item.label" class="ratio-compare-row">
                <div class="ratio-compare-head">
                  <strong>{{ item.label }}</strong>
                  <span>实际 {{ item.actual }}% / 目标 {{ item.target }}%</span>
                </div>
                <div class="ratio-compare-track">
                  <div class="ratio-compare-fill" :style="{ width: `${item.actual}%`, backgroundColor: item.color }"></div>
                  <div class="ratio-compare-marker" :style="{ left: `${item.target}%` }">
                    <span>目标</span>
                  </div>
                </div>
                <div class="ratio-compare-foot" :class="item.tone">
                  <span>偏差 {{ item.diffText }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="section-row">
      <el-col :span="24">
        <el-card class="glass-effect section-card">
          <template #header>
            <div class="section-title">
              <el-icon><ForkSpoon /></el-icon>
              <span>分餐分析</span>
            </div>
          </template>

          <div v-if="mealCards.length" class="meal-grid">
            <div v-for="item in mealCards" :key="item.key" class="meal-card" :class="item.tone">
              <div class="meal-card-head">
                <strong>{{ item.title }}</strong>
                <span class="state-pill" :class="item.tone">{{ item.status }}</span>
              </div>
              <div class="meal-track-card">
                <div class="meal-track-head">
                  <span>实际 {{ item.calories }} kcal</span>
                  <span>建议 {{ item.targetCalories }} kcal</span>
                </div>
                <div class="meal-track">
                  <div class="meal-track-fill" :class="item.tone" :style="{ width: `${item.actualWidth}%` }"></div>
                  <div v-if="item.targetMarker > 0" class="meal-track-marker" :style="{ left: `${item.targetMarker}%` }"></div>
                </div>
                <div class="meal-track-foot">
                  <span>全天占比 {{ item.share }}%</span>
                  <span>虚线=建议值，较建议 {{ item.deltaText }}</span>
                </div>
              </div>
              <p>{{ item.comment }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无分餐分析数据" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="section-row">
      <el-col :xs="24" :sm="24" :lg="10">
        <el-card class="glass-effect section-card full-height">
          <template #header>
            <div class="section-title">
              <el-icon><Trophy /></el-icon>
              <span>今日分析重点</span>
            </div>
          </template>
          <div v-if="highlights.length" class="list-panel">
            <div v-for="(item, index) in highlights" :key="`${item}-${index}`" class="list-item">
              <span class="list-index">{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无分析重点" :image-size="70" />
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :lg="14">
        <el-card class="glass-effect section-card full-height">
          <template #header>
            <div class="section-title">
              <el-icon><Opportunity /></el-icon>
              <span>明日调整建议</span>
            </div>
          </template>
          <div v-if="suggestions.length" class="list-panel">
            <div v-for="(item, index) in suggestions" :key="`${item}-${index}`" class="list-item">
              <span class="list-index">{{ index + 1 }}</span>
              <p>{{ item }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无调整建议" :image-size="70" />
        </el-card>
      </el-col>
    </el-row>

    <el-row v-if="quickQuestions.length" :gutter="20" class="section-row">
      <el-col :span="24">
        <el-card class="glass-effect section-card">
          <template #header>
            <div class="section-title">
              <el-icon><Opportunity /></el-icon>
              <span>AI 快捷提问</span>
            </div>
          </template>

          <div class="quick-question-grid">
            <button
              v-for="(item, index) in quickQuestions"
              :key="`${item}-${index}`"
              type="button"
              class="quick-question-item"
              @click="askQuickQuestion(item)"
            >
              <span class="quick-question-index">{{ index + 1 }}</span>
              <span>{{ item }}</span>
            </button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.report-container {
  padding-bottom: 20px;
}

.hero-card,
.section-card {
  animation: fade-up 0.45s ease;
}

.hero-layout {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 22px;
}

.hero-main {
  min-width: 0;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 237, 213, 0.9);
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.hero-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;

  h2 {
    margin: 0;
    font-size: 30px;
    color: #7c2d12;
    line-height: 1.2;
  }
}

.goal-tag {
  flex-shrink: 0;
  padding: 7px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff0e1, #ffedd5);
  border: 1px solid #fdba74;
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.report-sync-tip {
  display: inline-flex;
  align-items: center;
  margin-top: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 247, 237, 0.92);
  border: 1px solid rgba(253, 186, 116, 0.9);
  color: #c2410c;
  font-size: 12px;
  font-weight: 600;
}

.hero-overview {
  margin: 16px 0 0;
  color: #475569;
  font-size: 15px;
  line-height: 1.9;
}

.advice-box {
  margin-top: 18px;
  padding: 18px 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(255, 194, 140, 0.22), rgba(255, 255, 255, 0.92));
  border: 1px solid rgba(255, 214, 177, 0.95);

  span {
    display: inline-block;
    margin-bottom: 8px;
    color: #c2410c;
    font-size: 12px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #4a5568;
    line-height: 1.8;
  }
}

.meta-grid,
.energy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.meta-item,
.metric-card,
.nutrient-card,
.meal-card,
.ratio-card,
.list-item,
.energy-comment,
.energy-ring-card {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.82);
}

.meta-item,
.metric-card {
  padding: 18px;

  span {
    display: block;
    margin-bottom: 8px;
    color: #94a3b8;
    font-size: 12px;
  }

  strong {
    color: #7c2d12;
    font-size: 18px;
    line-height: 1.4;
  }
}

.meta-item.good {
  background: rgba(255, 247, 237, 0.95);
  border-color: rgba(253, 186, 116, 0.9);
}

.meta-item.warn {
  background: rgba(254, 242, 242, 0.95);
  border-color: rgba(252, 165, 165, 0.9);
}

.meta-item.low {
  background: rgba(240, 253, 250, 0.95);
  border-color: rgba(153, 246, 228, 0.9);
}

.section-row {
  margin-top: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #9a3412;
}

.full-height {
  height: 100%;
}

.energy-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 20px;
}

.energy-ring-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(255, 249, 243, 0.96), rgba(255, 255, 255, 0.82));
}

.energy-ring {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 10px rgba(255, 255, 255, 0.72);
}

.energy-ring-inner {
  width: 136px;
  height: 136px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px rgba(249, 115, 22, 0.12);

  span {
    font-size: 12px;
    color: #94a3b8;
  }

  strong {
    margin-top: 6px;
    color: #c2410c;
    font-size: 34px;
    line-height: 1;
  }

  small {
    margin-top: 8px;
    color: #7c2d12;
    font-size: 12px;
    font-weight: 700;
  }
}

.energy-ring-caption {
  margin-top: 18px;
  text-align: center;

  strong {
    display: block;
    color: #7c2d12;
    font-size: 16px;
  }

  p {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.7;
  }
}

.energy-panel {
  display: grid;
  gap: 16px;
}

.energy-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.energy-bars {
  padding: 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.95);
}

.energy-bar-row + .energy-bar-row {
  margin-top: 14px;
}

.energy-bar-head,
.progress-head,
.ratio-header,
.meal-card-head,
.meal-track-head,
.meal-track-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.energy-bar-head,
.progress-head,
.meal-track-head,
.meal-track-foot,
.ratio-values,
.ratio-legend-item {
  font-size: 12px;
  color: #64748b;
}

.energy-bar-head b,
.progress-head b {
  color: #7c2d12;
}

.energy-bar-track,
.progress-track,
.meal-track,
.ratio-stack {
  overflow: hidden;
  background: #fff1e8;
}

.energy-bar-track,
.progress-track {
  height: 10px;
  margin-top: 8px;
  border-radius: 999px;
}

.energy-bar-fill,
.progress-fill,
.meal-track-fill {
  height: 100%;
  border-radius: inherit;
}

.target {
  background: linear-gradient(90deg, #fed7aa, #fb923c);
}

.good {
  &.energy-bar-fill,
  &.progress-fill,
  &.meal-track-fill {
    background: linear-gradient(90deg, #fdba74, #f97316);
  }
}

.warn {
  &.energy-bar-fill,
  &.progress-fill,
  &.meal-track-fill {
    background: linear-gradient(90deg, #fda4af, #ef4444);
  }
}

.low {
  &.energy-bar-fill,
  &.progress-fill,
  &.meal-track-fill {
    background: linear-gradient(90deg, #99f6e4, #14b8a6);
  }
}

.pending {
  &.energy-bar-fill,
  &.progress-fill,
  &.meal-track-fill {
    background: linear-gradient(90deg, #cbd5e1, #94a3b8);
  }
}

.energy-bar-note,
.ratio-values {
  margin-top: 10px;
  color: #94a3b8;
  font-size: 12px;
}

.energy-comment {
  padding: 20px 22px;

  p {
    margin: 0;
    color: #475569;
    line-height: 1.9;
  }
}

.comment-label {
  margin-bottom: 10px;
  color: #c2410c;
  font-size: 12px;
  font-weight: 700;
}

.energy-comment.good {
  background: rgba(255, 247, 237, 0.95);
}

.energy-comment.warn {
  background: rgba(254, 242, 242, 0.95);
}

.energy-comment.low {
  background: rgba(240, 253, 250, 0.95);
}

.nutrient-grid,
.ratio-panel,
.list-panel {
  display: grid;
  gap: 14px;
}

.nutrient-card,
.meal-card,
.ratio-card,
.list-item {
  padding: 18px;
}

.nutrient-card p,
.meal-card p,
.list-item p {
  margin: 14px 0 0;
  color: #64748b;
  line-height: 1.75;
  font-size: 13px;
}

.nutrient-head strong,
.ratio-header strong,
.meal-card-head strong {
  color: #9a3412;
}

.state-pill {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}

.state-pill.good {
  color: #9a3412;
  background: #fff0e1;
  border-color: #fdba74;
}

.state-pill.warn {
  color: #b91c1c;
  background: #fee2e2;
  border-color: #fca5a5;
}

.state-pill.low {
  color: #0f766e;
  background: #ccfbf1;
  border-color: #99f6e4;
}

.state-pill.pending {
  color: #64748b;
  background: #f1f5f9;
  border-color: #e2e8f0;
}

.nutrient-values {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;

  div {
    padding: 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.78);
  }

  span {
    display: block;
    margin-bottom: 6px;
    color: #94a3b8;
    font-size: 12px;
  }

  b {
    color: #7c2d12;
    font-size: 15px;
  }
}

.progress-block {
  margin-top: 14px;
}

.ratio-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.ratio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.ratio-stack {
  display: flex;
  width: 100%;
  height: 24px;
  margin-top: 12px;
  border-radius: 999px;
}

.ratio-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.ratio-compare-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 250, 245, 0.96), rgba(255, 255, 255, 0.88));
  border: 1px solid rgba(255, 255, 255, 0.95);
}

.ratio-compare-title {
  margin-bottom: 14px;
  color: #9a3412;
  font-size: 14px;
  font-weight: 700;
}

.ratio-compare-row + .ratio-compare-row {
  margin-top: 14px;
}

.ratio-compare-head,
.ratio-compare-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ratio-compare-head {
  margin-bottom: 8px;

  strong {
    color: #7c2d12;
    font-size: 13px;
  }

  span {
    color: #64748b;
    font-size: 12px;
  }
}

.ratio-compare-track {
  position: relative;
  height: 12px;
  border-radius: 999px;
  background: #fff1e8;
}

.ratio-compare-fill {
  height: 100%;
  border-radius: inherit;
}

.ratio-compare-marker {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 2px;
  border-left: 2px dashed #7c2d12;
  transform: translateX(-1px);

  span {
    position: absolute;
    top: -22px;
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 6px;
    border-radius: 999px;
    background: #7c2d12;
    color: #fff;
    font-size: 10px;
    line-height: 1.2;
    white-space: nowrap;
  }
}

.ratio-compare-foot {
  margin-top: 8px;
  font-size: 12px;

  &.good {
    color: #9a3412;
  }

  &.warn {
    color: #b91c1c;
  }

  &.low {
    color: #0f766e;
  }

  &.pending {
    color: #64748b;
  }
}

.meal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.meal-track-card {
  margin-top: 14px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
}

.meal-track {
  position: relative;
  height: 14px;
  margin-top: 10px;
  border-radius: 999px;
  overflow: hidden;
}

.meal-track-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  border-left: 2px dashed #7c2d12;
  transform: translateX(-1px);
}

.list-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.95), rgba(255, 255, 255, 0.86));
}

.quick-question-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quick-question-item {
  width: 100%;
  padding: 16px 18px;
  border: 1px solid rgba(255, 214, 177, 0.95);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 255, 255, 0.9));
  color: #7c2d12;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.quick-question-item:hover {
  transform: translateY(-2px);
  border-color: #fb923c;
  box-shadow: 0 14px 30px rgba(249, 115, 22, 0.12);
}

.quick-question-index {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb676, #ff7a18);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.list-index {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffb676, #ff7a18);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

@media (max-width: 1200px) {
  .hero-layout,
  .energy-layout,
  .meal-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-head,
  .energy-bar-head,
  .progress-head,
  .ratio-header,
  .meal-card-head,
  .meal-track-head,
  .meal-track-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-head h2 {
    font-size: 24px;
  }

  .meta-grid,
  .energy-grid,
  .nutrient-values,
  .meal-grid,
  .quick-question-grid {
    grid-template-columns: 1fr;
  }

  .ratio-values {
    display: grid;
    gap: 6px;
  }
}
</style>
