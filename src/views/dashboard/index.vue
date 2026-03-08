<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI } from '@/api/analysis'
import { getUserInfoAPI, updateUserInfoAPI } from '@/api/user'
import { getDietListAPI } from '@/api/diet'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { Trophy, Edit, Apple, Guide, Aim, Location, Male, Female, Sunrise } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getLocalDateOffsetString, getLocalDateString } from '@/utils/date'

const userStore = useUserStore()
const router = useRouter()
const loading = ref(false)

// 页面报表数据
const report = ref({
  totalCalories: 0, recommendCalories: 2000, diff: 0,
  totalProtein: 0, totalFat: 0, totalCarb: 0, advice: '正在深度分析您的健康数据...'
})

let chartInstance: any = null
let trendInstance: any = null
const chartRef = ref(null)
const trendRef = ref(null)
const dialogVisible = ref(false)
const bodyForm = reactive({ age: 0, height: 0, weight: 0, target: 0, gender: 1 })

// --- 核心计算属性 ---
const bmi = computed(() => {
  const h = userStore.userInfo.height; const w = userStore.userInfo.weight
  return h && w ? parseFloat((w / ((h / 100) * (h / 100))).toFixed(1)) : 0
})

const heroAdvice = computed(() => {
  const target = Math.round(report.value.recommendCalories || 0)
  const total = Math.round(report.value.totalCalories || 0)
  if (!target) return '从今天开始记录饮食，云膳 AI 会给你更精准的建议。'
  const diff = total - target
  if (diff > 250) return `今日已超出目标约 ${diff} kcal，晚餐建议减油少盐并适当步行。`
  if (diff < -250) return `今日摄入较目标少约 ${Math.abs(diff)} kcal，可补充优质蛋白和蔬菜。`
  return '今日摄入接近目标，继续保持稳定节奏。'
})

const resolveUserId = (): number => {
  const id = userStore.userInfo?.id
  if (id != null && Number(id) > 0) return Number(id)
  try {
    const cached = localStorage.getItem('userInfo')
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed?.id) {
        userStore.userInfo = parsed
        return Number(parsed.id)
      }
    }
  } catch (_) {}
  return 0
}

const loadData = async () => {
  loading.value = true
  try {
    let userId = resolveUserId()
    if (!userId) {
      const userRes = await getUserInfoAPI()
      userStore.userInfo = userRes.data
      userId = userRes.data?.id ?? 0
    }
    if (!userId) { loading.value = false; return }
    const today = getLocalDateString()
    const reportRes = await getAnalysisReportAPI({ userId, date: today })
    if (reportRes.data) report.value = reportRes.data

    initGaugeChart()
    await loadSevenDaysTrend()
  } catch (error) { console.error(error) } finally { loading.value = false }
}

// 1. 今日热量仪表盘 (带标题，修复拥挤)
const initGaugeChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value)
  const target = Math.round(report.value.recommendCalories || 2000)
  
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
      data: [{ value: Math.round(report.value.totalCalories) }]
    }]
  })
}

// 2. 加载并渲染七日趋势图（不含今天，取过去 7 天）
const loadSevenDaysTrend = async () => {
  if (!trendRef.value) return
  const dates = [...Array(7)].map((_, i) => getLocalDateOffsetString(i - 7))
  const promises = dates.map(date => getDietListAPI({ pageNum: 1, pageSize: 100, date, userId: userStore.userInfo.id }))
  const results = await Promise.all(promises)
  const caloriesTrend = results.map(res => (res.data?.records || []).reduce((sum: number, item: any) => sum + (item.totalCalories || 0), 0))
  
  if (trendInstance) trendInstance.dispose()
  trendInstance = echarts.init(trendRef.value)
  trendInstance.setOption({
    title: { text: '近七日热量摄入趋势 (kcal)', left: 'center', top: '10', textStyle: { fontSize: 14, color: '#7c2d12' } },
    grid: { left: '4%', right: '4%', bottom: '10%', top: '22%', containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
    xAxis: { type: 'category', boundaryGap: false, data: dates.map(d => d.slice(5)), axisLine: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [{ 
      data: caloriesTrend, type: 'line', smooth: true, symbolSize: 10, 
      itemStyle: { color: '#ff7a18', borderWidth: 3, borderColor: '#fff' }, 
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(255,122,24,0.26)'},{offset:1,color:'transparent'}]) },
      lineStyle: { width: 4 }
    }]
  })
}

const openBodyDialog = () => {
  const u = userStore.userInfo
  bodyForm.age = u?.age ?? 0
  bodyForm.height = u?.height ?? 0
  bodyForm.weight = u?.weight ?? 0
  bodyForm.target = u?.target ?? 0
  bodyForm.gender = u?.gender ?? 1
  dialogVisible.value = true
}

const handleUpdateBody = async () => {
  await updateUserInfoAPI({ ...userStore.userInfo, ...bodyForm })
  ElMessage.success('更新成功'); dialogVisible.value = false; loadData()
}

onMounted(() => { loadData(); window.addEventListener('resize', () => { chartInstance?.resize(); trendInstance?.resize() }) })
</script>

<template>
  <div class="dashboard-container" v-loading="loading">
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

    <!-- 中间核心数据层 -->
    <el-row :gutter="20">
      <!-- 左：今日热量仪表盘 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="9">
        <el-card class="glass-effect stat-card">
          <div ref="chartRef" class="chart-box"></div>
          <div class="gauge-footer">今日目标上限: {{ Math.round(report.recommendCalories) }} kcal</div>
        </el-card>
      </el-col>
      <!-- 右：营养素详情 -->
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

    <!-- 下部趋势与档案层 -->
    <el-row :gutter="20" class="mt-25">
      <!-- 7日趋势图 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="15">
        <el-card class="glass-effect trend-box">
          <div ref="trendRef" class="trend-chart-wrap"></div>
        </el-card>
      </el-col>
      
      <!-- 身体档案卡 (带大幅水印填充) -->
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
            </div>
            
            <!-- 🎨 这里的空白改用大幅半透明装饰背景图标填充 -->
            <div class="bg-watermark">
              <el-icon><Sunrise /></el-icon>
            </div>

            <div class="info-footer">
               自律生活，从每一口食物开始 ✨
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 弹窗部分 -->
    <el-dialog v-model="dialogVisible" title="身体数据更新" width="400px">
       <el-form label-position="top">
          <el-row :gutter="15">
            <el-col :span="12"><el-form-item label="身高(cm)"><el-input-number v-model="bodyForm.height" style="width:100%" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="体重(kg)"><el-input-number v-model="bodyForm.weight" :precision="1" style="width:100%" /></el-form-item></el-col>
          </el-row>
          <el-form-item label="计划">
            <el-radio-group v-model="bodyForm.target" class="meal-radios">
              <el-radio-button :label="-1">减脂</el-radio-button>
              <el-radio-button :label="0">维持</el-radio-button>
              <el-radio-button :label="1">增肌</el-radio-button>
              <el-radio-button :label="2">糖尿病控糖</el-radio-button>
              <el-radio-button :label="3">高血压低盐</el-radio-button>
              <el-radio-button :label="4">高血脂低脂</el-radio-button>
            </el-radio-group>
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
