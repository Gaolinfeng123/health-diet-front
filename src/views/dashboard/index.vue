<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI } from '@/api/analysis'
import { getUserInfoAPI, updateUserInfoAPI } from '@/api/user'
import { getDietListAPI } from '@/api/diet'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { Trophy, Edit, Apple, Guide, Aim, User, Location, Male, Female, Sunrise, DataLine } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

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

const loadData = async () => {
  loading.value = true
  try {
    const userRes = await getUserInfoAPI()
    userStore.userInfo = userRes.data
    const today = new Date().toISOString().split('T')[0]
    const reportRes = await getAnalysisReportAPI({ userId: userRes.data.id, date: today })
    if (reportRes.data) report.value = reportRes.data
    
    // 初始化两大图表
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
      textStyle: { color: '#64748b', fontSize: 14, fontWeight: 'normal' }
    },
    series: [{
      type: 'gauge', startAngle: 210, endAngle: -30, min: 0, max: Math.max(target, 2500),
      radius: '100%', center: ['50%', '50%'],
      axisLine: { lineStyle: { width: 14, color: [[1, '#f1f5f9']] } },
      progress: { 
        show: true, width: 14, 
        itemStyle: { color: new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#34d399'},{offset:1,color:'#10b981'}]) } 
      },
      splitLine: { show: false }, axisTick: { show: false }, axisLabel: { show: false },
      detail: { 
        offsetCenter: [0, '15%'], fontSize: 32, fontWeight: '800', 
        color: '#10b981', formatter: '{value} kcal' 
      },
      data: [{ value: Math.round(report.value.totalCalories) }]
    }]
  })
}

// 2. 加载并渲染七日趋势图
const loadSevenDaysTrend = async () => {
  if (!trendRef.value) return
  const dates = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
  const promises = dates.map(date => getDietListAPI({ pageNum: 1, pageSize: 100, date, userId: userStore.userInfo.id }))
  const results = await Promise.all(promises)
  const caloriesTrend = results.map(res => (res.data?.records || []).reduce((sum: number, item: any) => sum + (item.totalCalories || 0), 0))
  
  if (trendInstance) trendInstance.dispose()
  trendInstance = echarts.init(trendRef.value)
  trendInstance.setOption({
    title: { text: '近七日热量摄入趋势 (kcal)', left: 'center', top: '10', textStyle: { fontSize: 14, color: '#1e293b' } },
    grid: { left: '4%', right: '4%', bottom: '10%', top: '22%', containLabel: true },
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12 },
    xAxis: { type: 'category', boundaryGap: false, data: dates.map(d => d.slice(5)), axisLine: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [{ 
      data: caloriesTrend, type: 'line', smooth: true, symbolSize: 10, 
      itemStyle: { color: '#10b981', borderWidth: 3, borderColor: '#fff' }, 
      areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(16,185,129,0.25)'},{offset:1,color:'transparent'}]) },
      lineStyle: { width: 4 }
    }]
  })
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
            <h2>{{ userStore.userInfo.nickname || '同学' }}，早安！🍏</h2>
            <p><el-icon><Guide /></el-icon> {{ report.advice }}</p>
          </div>
          <el-button type="primary" size="large" round @click="router.push('/diet')">记录今日饮食</el-button>
        </div>
      </el-col>
    </el-row>

    <!-- 中间核心数据层 -->
    <el-row :gutter="20">
      <!-- 左：今日热量仪表盘 -->
      <el-col :span="9">
        <el-card class="glass-effect stat-card">
          <div ref="chartRef" class="chart-box"></div>
          <div class="gauge-footer">目标上限: {{ Math.round(report.recommendCalories) }} kcal</div>
        </el-card>
      </el-col>
      <!-- 右：营养素详情 -->
      <el-col :span="15">
        <el-card class="glass-effect stat-card">
          <template #header><div class="card-title"><el-icon><Apple /></el-icon> 三大营养素分析</div></template>
          <div class="nutrient-grid">
             <div class="nu-block">
               <div class="nu-label"><span>蛋白质 (Protein)</span><b>{{Number(((report.totalProtein/100)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalProtein/100)*100).toFixed(1))" color="#34d399" :show-text="false" />
             </div>
             <div class="nu-block">
               <div class="nu-label"><span>碳水 (Carbs)</span><b>{{Number(((report.totalCarb/200)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalCarb/200)*100).toFixed(1))" color="#fbbf24" :show-text="false" />
             </div>
             <div class="nu-block">
               <div class="nu-label"><span>脂肪 (Fat)</span><b>{{Number(((report.totalFat/60)*100).toFixed(1))}}%</b></div>
               <el-progress :percentage="Number(((report.totalFat/60)*100).toFixed(1))" color="#f87171" :show-text="false" />
             </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下部趋势与档案层 -->
    <el-row :gutter="20" class="mt-25">
      <!-- 7日趋势图 -->
      <el-col :span="15">
        <el-card class="glass-effect trend-box">
          <div ref="trendRef" style="height: 335px; width: 100%"></div>
        </el-card>
      </el-col>
      
      <!-- 身体档案卡 (带大幅水印填充) -->
      <el-col :span="9">
        <el-card class="glass-effect info-card">
          <template #header>
            <div class="card-title">
              <span>身体档案</span>
              <el-button link type="primary" :icon="Edit" @click="dialogVisible = true">修改数据</el-button>
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
          <el-form-item label="计划"><el-radio-group v-model="bodyForm.target"><el-radio-button :label="-1">减脂</el-radio-button><el-radio-button :label="0">维持</el-radio-button><el-radio-button :label="1">增肌</el-radio-button></el-radio-group></el-form-item>
       </el-form>
       <template #footer><el-button type="primary" @click="handleUpdateBody" style="width:100%">确认保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dashboard-container { padding-bottom: 20px; }
.hero-card { 
  padding: 30px 40px; border-radius: 32px; display: flex; justify-content: space-between; align-items: center; 
  background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(255,255,255,0.4));
  .hero-text { h2 { margin: 0; color: #065f46; font-size: 26px; } p { margin-top: 10px; color: #64748b; font-size: 14px; display: flex; align-items: center; gap: 8px; } }
}
.stat-card { height: 320px; .chart-box { height: 240px; } .gauge-footer { text-align: center; font-size: 13px; color: #94a3b8; font-weight: 600; margin-top: -10px; } }
.nutrient-grid { .nu-block { margin-bottom: 25px; .nu-label { display: flex; justify-content: space-between; margin-bottom: 8px; span { font-size: 12px; color: #64748b; } b { color: #1e293b; } } } }
.trend-box { border-radius: 32px; padding: 10px; }

.info-card { 
  height: 380px; position: relative; overflow: hidden;
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; position: relative; z-index: 2;
    .it { display: flex; align-items: center; gap: 10px; span { font-size: 12px; color: #94a3b8; } p { margin: 0; font-size: 16px; font-weight: bold; color: #2d3748; } }
  }
  .bg-watermark {
    position: absolute; right: -40px; bottom: -40px; font-size: 280px; 
    color: rgba(16, 185, 129, 0.05); transform: rotate(-15deg); pointer-events: none;
  }
  .info-footer { position: absolute; bottom: 25px; left: 0; width: 100%; text-align: center; font-size: 12px; color: #10b981; opacity: 0.6; }
}

.card-title { font-weight: bold; display: flex; align-items: center; justify-content: space-between; gap: 5px; color: #1e293b; }
.mb-25 { margin-bottom: 25px; } .mt-25 { margin-top: 25px; }
:deep(.el-card__header) { padding: 15px 25px; border-bottom: 1px solid rgba(0,0,0,0.03); }
</style>