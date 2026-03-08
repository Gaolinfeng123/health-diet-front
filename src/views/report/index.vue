<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { getTodayRecommendAPI } from '@/api/recommend'
import { getUserInfoAPI } from '@/api/user'
import { getAnalysisReportAPI } from '@/api/analysis'
import type { RecommendData } from '@/api/recommend'
import { ElMessage } from 'element-plus'
import { Calendar, Document, Finished, ForkSpoon } from '@element-plus/icons-vue'
import { getLocalDateOffsetString, getLocalDateString } from '@/utils/date'

const userStore = useUserStore()
const loading = ref(false)
const recommendData = ref<RecommendData | null>(null)
const actualData = ref<any>(null)
const recommendDate = ref(getLocalDateString())
const actualDate = ref(getLocalDateOffsetString(-1))

const toNumber = (value: unknown) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const toPercent = (value: unknown) => {
  const raw = toNumber(value)
  const percent = raw <= 1 ? raw * 100 : raw
  return Number(percent.toFixed(1))
}

const resolveUserId = async () => {
  const storeId = toNumber(userStore.userInfo?.id)
  if (storeId > 0) return storeId

  const cache = localStorage.getItem('userInfo')
  if (cache) {
    try {
      const parsed = JSON.parse(cache)
      const cachedId = toNumber(parsed?.id)
      if (cachedId > 0) return cachedId
    } catch (e) {
      console.error('user cache parse failed')
    }
  }

  try {
    const res = await getUserInfoAPI()
    if (res?.data) {
      userStore.userInfo = res.data
      localStorage.setItem('userInfo', JSON.stringify(res.data))
      const apiId = toNumber(res.data.id)
      if (apiId > 0) return apiId
    }
  } catch (e) {
    console.error('load user info failed')
  }
  return 0
}

const loadRecommend = async () => {
  loading.value = true
  try {
    const userId = await resolveUserId()
    if (!userId) {
      ElMessage.warning('未找到用户信息，暂时无法加载推荐报告')
      return
    }
    const todayDate = getLocalDateString()
    const yesterdayDate = getLocalDateOffsetString(-1)
    recommendDate.value = todayDate
    actualDate.value = yesterdayDate
    const [recommendRes, analysisRes] = await Promise.all([
      getTodayRecommendAPI(userId, todayDate),
      getAnalysisReportAPI({ userId, date: yesterdayDate })
    ])
    recommendData.value = recommendRes.data || null
    actualData.value = analysisRes.data || null
  } catch (e) {
    ElMessage.error('加载推荐报告失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const summary = computed(() => recommendData.value?.summary || null)
const dailySummary = computed(() => recommendData.value?.dailySummary || null)
const meals = computed(() => recommendData.value?.meals || [])
const extraAdvice = computed(() => recommendData.value?.extraAdvice || [])
const actualCalories = computed(() => toNumber(actualData.value?.totalCalories))
const reportDateLabel = computed(() => recommendData.value?.date || recommendDate.value)
const actualDateLabel = computed(() => actualDate.value)

const goalLabel = computed(() => {
  const goal = summary.value?.goal || ''
  const map: Record<string, string> = {
    lose_fat: '减脂管理',
    maintain: '维持体态',
    gain_muscle: '增肌强化',
    diabetes_control: '糖尿病控糖',
    hypertension_control: '高血压低盐',
    hyperlipidemia_control: '高血脂低脂'
  }
  return map[goal] || '个性化目标'
})

const bodyStatus = computed(() => {
  const status = summary.value?.status || ''
  const map: Record<string, { text: string; level: string }> = {
    underweight: { text: '偏瘦', level: 'normal' },
    normal: { text: '正常', level: 'good' },
    overweight: { text: '超重', level: 'warn' },
    obese: { text: '肥胖', level: 'warn' }
  }
  return map[status] || { text: '待评估', level: 'pending' }
})

const pfcItems = computed(() => {
  const ratio = dailySummary.value?.pfcRatio || { protein: 0, fat: 0, carbs: 0 }
  const targetMacros = dailySummary.value?.totalMacros || { protein: 0, fat: 0, carbs: 0 }
  const actualMacros = {
    protein: toNumber(actualData.value?.totalProtein),
    fat: toNumber(actualData.value?.totalFat),
    carbs: toNumber(actualData.value?.totalCarb)
  }

  const buildDiff = (actual: number, target: number) => {
    const diff = actual - target
    const rounded = Number(diff.toFixed(1))
    return {
      value: rounded,
      text: `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}g`,
      level: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
    }
  }

  const targetProtein = toNumber(targetMacros.protein)
  const targetFat = toNumber(targetMacros.fat)
  const targetCarbs = toNumber(targetMacros.carbs)

  return [
    {
      key: 'protein',
      label: '蛋白质',
      percent: toPercent(ratio.protein),
      color: '#ff9838',
      target: targetProtein,
      actual: actualMacros.protein,
      diff: buildDiff(actualMacros.protein, targetProtein)
    },
    {
      key: 'fat',
      label: '脂肪',
      percent: toPercent(ratio.fat),
      color: '#fb7185',
      target: targetFat,
      actual: actualMacros.fat,
      diff: buildDiff(actualMacros.fat, targetFat)
    },
    {
      key: 'carbs',
      label: '碳水',
      percent: toPercent(ratio.carbs),
      color: '#f59e0b',
      target: targetCarbs,
      actual: actualMacros.carbs,
      diff: buildDiff(actualMacros.carbs, targetCarbs)
    }
  ]
})

onMounted(() => {
  loadRecommend()
})
</script>

<template>
  <div class="report-container" v-loading="loading">
    <el-row :gutter="20">
      <el-col :xs="24" :sm="24" :md="16" :lg="16">
        <el-card class="glass-effect detail-card">
          <template #header>
            <div class="title">
              <el-icon><Document /></el-icon>
              <span>营养深度分析报告</span>
            </div>
          </template>

          <div v-if="recommendData" class="report-content">
            <div class="meta-line">
              <div class="date-pill"><el-icon><Calendar /></el-icon> {{ reportDateLabel }}</div>
              <div class="goal-pill">{{ goalLabel }}</div>
            </div>

            <div class="advice-box">
              <h4>今日核心策略</h4>
              <p>{{ summary?.keyMessage || '暂无核心策略' }}</p>
            </div>

            <div class="metrics-grid">
              <div class="m-item"><span>BMI</span><b>{{ toNumber(summary?.bmi).toFixed(1) }}</b></div>
              <div class="m-item">
                <span>体重状态</span>
                <div class="status-pill" :class="bodyStatus.level">{{ bodyStatus.text }}</div>
              </div>
              <div class="m-item"><span>七天平均目标热量</span><b>{{ Math.round(toNumber(summary?.caloriesTarget)) }} kcal</b></div>
              <div class="m-item">
                <span>昨日总热量（实际）</span>
                <b>{{ Math.round(actualCalories) }} kcal</b>
                <small>统计日期：{{ actualDateLabel }}</small>
              </div>
            </div>

            <div class="ratio-box">
              <div class="ratio-title">供能占比与摄入差值 (P/F/C)</div>
              <div class="ratio-hint">七日平均目标、昨日实际摄入；差值为昨日摄入与目标之差。</div>
              <div v-for="item in pfcItems" :key="item.key" class="ratio-row">
                <span>{{ item.label }}</span>
                <el-progress :percentage="item.percent" :show-text="false" :color="item.color" />
                <b>{{ item.percent }}%</b>
                <div class="ratio-sub">
                  七日平均目标 {{ item.target.toFixed(1) }}g · 昨日实际 {{ item.actual.toFixed(1) }}g ·
                  <em :class="item.diff.level">昨日与目标差值 {{ item.diff.text }}</em>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无今日推荐报告" :image-size="90" />
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="8" :lg="8">
        <el-card class="glass-effect side-card">
          <template #header>
            <div class="title">
              <el-icon><Finished /></el-icon>
              <span>总结与建议</span>
            </div>
          </template>

          <div v-if="recommendData" class="side-content">
            <div class="summary-text">{{ dailySummary?.summaryText || '暂无总结' }}</div>
            <h4>附加建议</h4>
            <ul class="suggestion-list">
              <li v-for="tip in extraAdvice" :key="tip">{{ tip }}</li>
            </ul>
          </div>
          <el-empty v-else description="暂无建议内容" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="24">
        <el-card class="glass-effect meal-card">
          <template #header>
            <div class="title">
              <el-icon><ForkSpoon /></el-icon>
              <span>今日推荐食谱</span>
            </div>
          </template>

          <div v-if="meals.length" class="meal-grid">
            <div v-for="meal in meals" :key="meal.type" class="meal-item">
              <div class="meal-head">
                <span class="meal-title">{{ meal.title }}</span>
                <span class="meal-kcal">{{ Math.round(toNumber(meal.calories)) }} kcal</span>
              </div>
              <div class="meal-menu">{{ meal.menu }}</div>
              <div class="meal-macro">
                P {{ toNumber(meal.macros?.protein).toFixed(1) }}g ·
                F {{ toNumber(meal.macros?.fat).toFixed(1) }}g ·
                C {{ toNumber(meal.macros?.carbs).toFixed(1) }}g
              </div>
              <p class="meal-advice">{{ meal.advice }}</p>
            </div>
          </div>
          <el-empty v-else description="暂无推荐食谱" :image-size="80" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.report-container {
  padding-bottom: 18px;
}

.detail-card,
.side-card,
.meal-card {
  animation: fade-up 0.45s ease;
}

.detail-card {
  min-height: 540px;
}

.title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9a3412;
}

.meta-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 10px;
}

.date-pill,
.goal-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
}

.date-pill {
  color: #9a3412;
  background: #fff0e1;
  border: 1px solid #ffd7b1;
}

.goal-pill {
  color: #7c2d12;
  background: #ffedd5;
  border: 1px solid #fdba74;
}

.advice-box {
  background: linear-gradient(130deg, rgba(255, 194, 140, 0.32), rgba(255, 255, 255, 0.65));
  padding: 20px;
  border-radius: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  h4 { margin: 0 0 10px 0; color: #c2410c; }
  p { margin: 0; color: #4a5568; line-height: 1.8; }
}

.metrics-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;

  .m-item {
    padding: 16px;
    background: rgba(255, 255, 255, 0.78);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    span { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 6px; }
    b { font-size: 18px; color: #7c2d12; }
    small {
      display: block;
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.4;
      color: #9a3412;
      opacity: 0.85;
    }
  }
}

.status-pill {
  width: fit-content;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
  &.good {
    color: #9a3412;
    background: #fff0e1;
    border-color: #ffd7b1;
  }
  &.normal {
    color: #7c2d12;
    background: #ffedd5;
    border-color: #fdba74;
  }
  &.warn {
    color: #b91c1c;
    background: #fee2e2;
    border-color: #fecaca;
  }
  &.pending {
    color: #6b7280;
    background: #f3f4f6;
    border-color: #e5e7eb;
  }
}

.ratio-box {
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.9);
}

.ratio-title {
  font-size: 14px;
  font-weight: 700;
  color: #9a3412;
  margin-bottom: 6px;
}

.ratio-hint {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 10px;
  line-height: 1.4;
}

.ratio-row {
  display: grid;
  grid-template-columns: 70px 1fr 52px;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  span {
    color: #6b7280;
    font-size: 12px;
  }
  b {
    color: #9a3412;
    font-size: 12px;
    text-align: right;
  }
  .ratio-sub {
    grid-column: 1 / -1;
    font-size: 12px;
    color: #64748b;
    margin-top: -2px;
    em {
      font-style: normal;
      font-weight: 700;
    }
    .up {
      color: #b91c1c;
    }
    .down {
      color: #0f766e;
    }
    .flat {
      color: #6b7280;
    }
  }
}

.side-card {
  min-height: 540px;
}

.summary-text {
  padding: 14px;
  border-radius: 14px;
  background: #fff3e6;
  border: 1px solid #ffd7b1;
  color: #7c2d12;
  line-height: 1.7;
  margin-bottom: 16px;
}

.side-content h4 {
  margin: 0 0 10px 0;
  color: #9a3412;
}

.suggestion-list {
  margin: 0;
  padding-left: 18px;
  color: #4a5568;
  li {
    margin-bottom: 10px;
    line-height: 1.6;
  }
}

.mt-20 {
  margin-top: 20px;
}

.meal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.meal-item {
  padding: 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.95);
}

.meal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.meal-title {
  color: #9a3412;
  font-weight: 700;
}

.meal-kcal {
  color: #ea580c;
  font-weight: 700;
  font-size: 12px;
}

.meal-menu {
  color: #1f2937;
  line-height: 1.6;
  margin-bottom: 8px;
}

.meal-macro {
  color: #64748b;
  font-size: 12px;
  margin-bottom: 8px;
}

.meal-advice {
  margin: 0;
  color: #7c2d12;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .meal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .detail-card,
  .side-card {
    min-height: auto;
    margin-bottom: 16px;
  }
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  .meal-grid {
    grid-template-columns: 1fr;
  }
  .meta-line {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
