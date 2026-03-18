<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI, getAnalysisTrendAPI } from '@/api/analysis'
import { updateUserInfoAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { Trophy, Edit, Apple, Guide, Aim, Location, Male, Female, Sunrise } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getLocalDateString } from '@/utils/date'
import { toNumber } from '@/utils/health'
import { useUserIdentity } from '@/composables/useUserIdentity'

const userStore = useUserStore()
const router = useRouter()
const summaryLoading = ref(false)
const trendLoading = ref(false)

// 页面报表数据
const report = ref<Record<string, any>>({
  totalCalories: 0, recommendCalories: 2000, diff: 0,
  totalProtein: 0, totalFat: 0, totalCarb: 0, advice: '正在分析你的健康数据...'
})

let chartInstance: any = null
let trendInstance: any = null
const chartRef = ref(null)
const trendRef = ref(null)
const dialogVisible = ref(false)
const bodyForm = reactive({ age: 0, height: 0, weight: 0, target: 0, gender: 1, activityLevel: 0 })
const { resolveUserId } = useUserIdentity()

const activityLevelMap: Record<number, string> = {
  1: '久坐少动',
  2: '轻量活动',
  3: '中等活动',
  4: '高活动量'
}

const normalizeActivityLevel = (value: unknown) => {
  const legacyMap: Record<string, number> = {
    sedentary: 1,
    light: 2,
    moderate: 3,
    active: 4,
    very_active: 4
  }

  if (typeof value === 'string' && legacyMap[value]) return legacyMap[value]
  const num = Number(value)
  return Number.isInteger(num) && num >= 1 && num <= 4 ? num : 0
}

const activityLevelLabel = computed(() => {
  return activityLevelMap[normalizeActivityLevel(userStore.userInfo.activityLevel || userStore.userInfo.activity_level)] || '未设置'
})

const reportTargetCalories = computed(() => {
  return Math.round(
    toNumber(
      report.value.targetCalories ??
      report.value.recommendCalories ??
      report.value.caloriesTarget
    ) || 0
  )
})

// 核心计算属性
const bmi = computed(() => {
  const h = userStore.userInfo.height; const w = userStore.userInfo.weight
  return h && w ? parseFloat((w / ((h / 100) * (h / 100))).toFixed(1)) : 0
})

const heroAdvice = computed(() => {
  const target = reportTargetCalories.value
  const total = Math.round(toNumber(report.value.totalCalories ?? report.value.actualCalories))
  if (!target) return '从今天开始记录饮食，系统会给你更准确的建议。'
  const diff = total - target
  if (diff > 250) return `今日摄入比目标高约 ${diff} kcal，晚餐建议减少油盐并适当活动。`
  if (diff < -250) return `今日摄入比目标少约 ${Math.abs(diff)} kcal，可以补充优质蛋白和蔬菜。`
  return '今日摄入接近目标，继续保持稳定节奏。'
})

const loadSummary = async (userId: number, today: string) => {
  summaryLoading.value = true
  try {
    const reportRes = await getAnalysisReportAPI({ userId, date: today })
    if (reportRes.data) {
      report.value = reportRes.data
      initGaugeChart()
    }
  } catch (error) {
    console.error(error)
  } finally {
    summaryLoading.value = false
  }
}

const loadTrend = async (userId: number) => {
  trendLoading.value = true
  try {
    const trendRes = await getAnalysisTrendAPI({ userId, days: 7 })
    renderTrendChart(normalizeTrendPoints(trendRes.data))
  } catch (error) {
    console.error(error)
  } finally {
    trendLoading.value = false
  }
}

const loadData = async () => {
  const userId = await resolveUserId()
  if (!userId) return

  const today = getLocalDateString()
  void loadSummary(userId, today)
  // 趋势图放到下一轮事件循环再加载，避免占住首页首屏
  window.setTimeout(() => {
    void loadTrend(userId)
  }, 0)
}

// 1. 今日热量仪表盘
const initGaugeChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  const target = Math.max(reportTargetCalories.value, 0) || 2000
  
  chartInstance.setOption({
    title: { 
      text: '今日热量达成',
      left: 'center', bottom: '12%',
      textStyle: { color: '#7c2d12', fontSize: 14, fontWeight: 'normal' }
    },
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: Math.max(target, 2500),
      radius: '100%', center: ['50%', '50%'],
      axisLine: { lineStyle: { width: 14, color: [[1, '#f1f5f9']] } },
      progress: { 
        show: true, width: 14, 
        itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#ffb676'},{offset:1,color:'#ff7a18'}]) } 
      },
      splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false },
      detail: { 
        offsetCenter: [0, '15%'], fontSize: 32, fontWeight: '800', 
        color: '#ea580c', formatter: '{value} kcal' 
      },
      data: [{ value: Math.round(toNumber(report.value.totalCalories ?? report.value.actualCalories)) }]
    }]
  })
}

const normalizeTrendPoints = (raw: any) => {
  const list = Array.isArray(raw)
    ? raw
    : raw?.points || raw?.records || raw?.list || raw?.trend || []

  return list.map((item: any) => ({
    date: String(item.date || item.day || item.statDate || ''),
    calories: toNumber(item.calories ?? item.totalCalories ?? item.value)
  }))
}

// 2. 渲染七日趋势图
const renderTrendChart = (points: Array<{ date: string; calories: number }>) => {
  if (!trendRef.value) return
  const dates = points.map((item: { date: string }) => item.date.slice(5) || item.date)
  const caloriesTrend = points.map((item: { calories: number }) => item.calories)
  
  if (trendInstance) trendInstance.dispose()
  trendInstance = echarts.init(trendRef.value)
  trendInstance.setOption({
    title: { text: '近七日热量摄入趋势 (kcal)', left: 'center', top: '10', textStyle: { fontSize: 14, color: '#7c2d12' } },
    grid: { left: '4%', right: '4%', bottom: '10%', top: '22%', containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
    xAxis: { type: 'category', boundaryGap: false, data: dates.map((d: string) => d), axisLine: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [{ 
      data: caloriesTrend, type: 'line', smooth: true, symbolSize: 10, 
      itemStyle: { color: '#ff7a18', borderWidth: 3, borderColor: '#fff' }, 
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(255,122,24,0.26)'},{offset:1,color:'transparent'}]) },
      lineStyle: { width: 4 }
    }]
  })
}

const handleResize = () => {
  chartInstance?.resize()
  trendInstance?.resize()
}

const openBodyDialog = () => {
  const u = userStore.userInfo
  bodyForm.age = u?.age ?? 0
  bodyForm.height = u?.height ?? 0
  bodyForm.weight = u?.weight ?? 0
  bodyForm.target = u?.target ?? 0
  bodyForm.gender = u?.gender ?? 1
  bodyForm.activityLevel = normalizeActivityLevel(u?.activityLevel ?? u?.activity_level)
  dialogVisible.value = true
}

const handleUpdateBody = async () => {
  const payload = {
    ...userStore.userInfo,
    ...bodyForm,
    age: Number(bodyForm.age ?? 0),
    height: Number(bodyForm.height ?? 0),
    weight: Number(bodyForm.weight ?? 0),
    target: Number(bodyForm.target ?? 0),
    gender: Number(bodyForm.gender ?? 1),
    activityLevel: Number(bodyForm.activityLevel ?? 0)
  }
  await updateUserInfoAPI(payload)
  userStore.userInfo = { ...userStore.userInfo, ...payload, activity_level: payload.activityLevel }
  localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
  ElMessage.success('更新成功')
  dialogVisible.value = false
  loadData()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  trendInstance?.dispose()
})
</script>

<template>
  <div
    class="dashboard-container"
    v-loading="summaryLoading"
    element-loading-text="正在加载首页数据..."
    element-loading-background="rgba(255, 255, 255, 0.72)"
  >
    <!-- 顶部摘要卡片 -->
    <el-row class="mb-25">
      <el-col :span="24">
        <div class="hero-card glass-effect">
          <div class="hero-text">
            <h2>智膳伴侣 · 今日饮食建议</h2>
            <p><el-icon><Guide /></el-icon> {{ heroAdvice }}</p>
          </div>
          <el-button type="primary" size="large" round @click="router.push('/diet')">记录今日饮食</el-button>
        </div>
      </el-col>
    </el-row>

    <!-- 中间核心数据区 -->
    <el-row :gutter="20">
      <!-- 左侧：今日热量仪表盘 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="9">
        <el-card class="glass-effect stat-card">
          <div ref="chartRef" class="chart-box"></div>
          <div class="gauge-footer">今日目标上限：{{ reportTargetCalories }} kcal</div>
        </el-card>
      </el-col>
      <!-- 右侧：营养素详情 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="15">
        <el-card class="glass-effect stat-card">
          <template #header><div class="card-title"><el-icon><Apple /></el-icon> 三大营养素分析</div></template>
          <div class="nutrient-grid">
             <div class="nu-block">
               <div class="nu-label"><span>蛋白质 (Protein)</span><b>{{Number(((report.totalProtein/100)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalProtein/100)*100).toFixed(1))" color="#ff9838" :show-text="false" />
             </div>
             <div class="nu-block">
               <div class="nu-label"><span>碳水 (Carbs)</span><b>{{Number(((report.totalCarb/200)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalCarb/200)*100).toFixed(1))" color="#f59e0b" :show-text="false" />
             </div>
             <div class="nu-block">
               <div class="nu-label"><span>脂肪 (Fat)</span><b>{{Number(((report.totalFat/60)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalFat/60)*100).toFixed(1))" color="#fb7185" :show-text="false" />
             </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下部趋势与档案区 -->
    <el-row :gutter="20" class="mt-25">
      <!-- 7日趋势图 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="15">
        <el-card
          class="glass-effect trend-box"
          v-loading="trendLoading"
          element-loading-text="正在加载近七日趋势..."
          element-loading-background="rgba(255, 255, 255, 0.68)"
        >
          <div ref="trendRef" class="trend-chart-wrap"></div>
        </el-card>
      </el-col>
      
      <!-- 身体档案卡 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="9">
        <el-card class="glass-effect info-card">
          <template #header>
            <div class="card-title">
              <span>身体档案</span>
              <el-button link type="primary" :icon="Edit" @click="openBodyDialog">修改数据</el-button>
            </div>
          </template>
          
          <div class="info-content">
            <div class="info-grid">
              <div class="it"><el-icon><Location /></el-icon> <span>身高</span><p>{{ userStore.userInfo.height }}cm</p></div>
              <div class="it"><el-icon><Aim /></el-icon> <span>体重</span><p>{{ userStore.userInfo.weight }}kg</p></div>
              <div class="it">
                <el-icon><component :is="userStore.userInfo.gender === 1 ? Male : Female" /></el-icon> 
                <span>性别</span><p>{{ userStore.userInfo.gender === 1 ? '男' : '女' }}</p>
              </div>
              <div class="it"><el-icon><Trophy /></el-icon> <span>BMI</span><p>{{ bmi }}</p></div>
              <div class="it"><el-icon><Sunrise /></el-icon> <span>活动量</span><p>{{ activityLevelLabel }}</p></div>
            </div>
            
            <div class="bg-watermark">
              <el-icon><Sunrise /></el-icon>
            </div>

            <div class="info-footer">
               自律生活，从每一口食物开始
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="身体数据更新" width="400px">
       <el-form label-position="top">
          <el-row :gutter="15">
            <el-col :span="12"><el-form-item label="身高(cm)"><el-input-number v-model="bodyForm.height" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="体重(kg)"><el-input-number v-model="bodyForm.weight" :precision="1" style="width:100%" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="目标">
            <el-radio-group v-model="bodyForm.target" class="meal-radios">
              <el-radio-button :label="-1">减脂</el-radio-button>
              <el-radio-button :label="0">保持</el-radio-button>
              <el-radio-button :label="1">增肌</el-radio-button>
              <el-radio-button :label="2">糖尿病控制</el-radio-button>
              <el-radio-button :label="3">高血压控制</el-radio-button>
              <el-radio-button :label="4">高血脂控制</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="活动量">
            <el-select v-model="bodyForm.activityLevel" placeholder="请选择活动量" style="width:100%">
              <el-option label="久坐少动" :value="1" />
              <el-option label="轻量活动" :value="2" />
              <el-option label="中等活动" :value="3" />
              <el-option label="高活动量" :value="4" />
            </el-select>
          </el-form-item>
       </el-form>
       <template #footer><el-button type="primary" @click="handleUpdateBody" style="width:100%">确认保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dashboard-container {
  padding-bottom: 20px;
  overflow-x: hidden;
  min-width: 0;
}
.hero-card { 
  padding: 30px 40px; border-radius: 32px; display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(130deg, rgba(255, 194, 140, 0.4), rgba(255,255,255,0.58));
  animation: fade-up 0.45s ease;
  .hero-text {
    h2 { margin: 0; color: #9a3412; font-size: 26px; }
    p { margin-top: 10px; color: #7c2d12; font-size: 14px; display: flex; align-items: center; gap: 8px; }
  }
}
.stat-card {
  height: 320px;
  animation: fade-up 0.5s ease;
  .chart-box { height: 240px; }
  .gauge-footer { text-align: center; font-size: 13px; color: #9a3412; font-weight: 600; margin-top: -10px; }
}
.nutrient-grid {
  .nu-block {
    margin-bottom: 25px;
    animation: fade-up 0.45s ease;
    .nu-label {
      display: flex; justify-content: space-between; margin-bottom: 8px;
      span { font-size: 12px; color: #64748b; }
      b { color: #7c2d12; }
    }
  }
}
.trend-box {
  border-radius: 32px;
  padding: 10px;
  animation: fade-up 0.55s ease;
  overflow: hidden;
  :deep(.el-card__body) {
    overflow: hidden;
    padding: 10px 15px;
  }
}
.trend-chart-wrap {
  height: 335px;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.info-card { 
  height: 380px; position: relative; overflow: hidden; animation: fade-up 0.6s ease;
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; position: relative; z-index: 2;
    .it {
      display: flex; align-items: center; gap: 10px;
      span { font-size: 12px; color: #94a3b8; }
      p { margin: 0; font-size: 16px; font-weight: bold; color: #2d3748; }
    }
  }
  .bg-watermark {
    position: absolute; right: -40px; bottom: -40px; font-size: 280px; 
    color: rgba(255, 122, 24, 0.08); transform: rotate(-15deg); pointer-events: none;
  }
  .info-footer { position: absolute; bottom: 25px; left: 0; width: 100%; text-align: center; font-size: 12px; color: #c2410c; opacity: 0.7; }
}

.card-title { font-weight: bold; display: flex; align-items: center; justify-content: space-between; gap: 5px; color: #1e293b; }
.mb-25 { margin-bottom: 25px; } .mt-25 { margin-top: 25px; }
:deep(.el-card__header) { padding: 15px 25px; border-bottom: 1px solid rgba(0,0,0,0.03); }

.meal-radios {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 6px;

  :deep(.el-radio-button__inner) {
    border-radius: 12px !important;
    border: 1px solid #e2e8f0 !important;
    margin: 0;
  }
}

@media (max-width: 960px) {
  .hero-card {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
    .hero-text h2 {
      font-size: 20px;
    }
  }
  .stat-card {
    height: auto;
    margin-bottom: 16px;
    .chart-box {
      height: 220px;
    }
  }
  .trend-box {
    margin-top: 0;
  }
  .info-card {
    height: auto;
    min-height: 320px;
    margin-top: 16px;
  }
}
</style>

