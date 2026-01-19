<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI } from '@/api/analysis'
import { getUserInfoAPI } from '@/api/user' // 确保这里引入了
import { useUserStore } from '@/stores/user'
import { Food, Timer, Trophy, Top, Bottom } from '@element-plus/icons-vue'

const userStore = useUserStore()
const loading = ref(false)

// 页面数据
const report = ref({
  totalCalories: 0,
  recommendCalories: 2000, // 给个默认值防止除以0
  diff: 0,
  totalProtein: 0,
  totalFat: 0,
  totalCarb: 0,
  advice: '暂无建议'
})

let chartInstance: any = null
const chartRef = ref(null)

// --- 核心修复：串行加载逻辑 ---
const loadData = async () => {
  loading.value = true
  try {
    // 1. 第一步：获取用户信息 (为了拿到 userId)
    // 无论 store 里有没有，都刷新一次，确保数据最新
    const userRes = await getUserInfoAPI()
    const latestUser = userRes.data
    
    // 更新到 Store
    userStore.userInfo = latestUser
    localStorage.setItem('userInfo', JSON.stringify(latestUser))

    // 2. 第二步：拿到 ID 后，再去查报表
    // 如果没有 ID，就不发请求了
    if (latestUser && latestUser.id) {
        const today = new Date().toISOString().split('T')[0]
        const reportRes = await getAnalysisReportAPI({ 
            userId: latestUser.id, // 使用刚才获取到的 ID
            date: today 
        })
        
        if (reportRes.data) {
            report.value = reportRes.data
        }
    }
    
    // 3. 初始化图表
    initChart()
    
  } catch (error) {
    console.error('加载数据失败', error)
  } finally {
    loading.value = false
  }
}

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: report.value.recommendCalories || 2000,
        splitNumber: 5,
        itemStyle: { color: '#409EFF' },
        progress: { show: true, width: 15 },
        pointer: { show: false },
        axisLine: { roundCap: true, lineStyle: { width: 15 } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: { show: true, fontSize: 20, offsetCenter: [0, '30%'], color: '#909399' },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-20%'],
          fontSize: 36,
          fontWeight: 'bold',
          formatter: '{value}',
          color: '#303133'
        },
        data: [{ value: report.value.totalCalories, name: '今日热量' }]
      }
    ]
  }
  chartInstance.setOption(option)
}

const handleResize = () => { chartInstance?.resize() }

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<template>
  <div class="dashboard-container" v-loading="loading">
    <div class="welcome-section">
      <h2>👋 早上好，{{ userStore.userInfo.nickname || userStore.userInfo.username }}</h2>
      <p class="subtitle">{{ report.advice || '今天也要保持健康饮食哦！' }}</p>
    </div>

    <div class="main-stats">
      <el-row :gutter="20">
        <el-col :span="10">
          <el-card shadow="hover" class="chart-card">
            <div ref="chartRef" class="chart-box"></div>
            <div class="target-text">目标: {{ report.recommendCalories }} kcal</div>
          </el-card>
        </el-col>

        <el-col :span="14">
          <el-card shadow="hover" class="nutrient-card">
            <template #header>
              <div class="card-header">
                <span><el-icon><Food /></el-icon> 营养摄入详情</span>
              </div>
            </template>
            <div class="nutrient-item">
              <div class="label">蛋白质</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalProtein / 100) * 100, 100)" status="success" />
            </div>
            <div class="nutrient-item">
              <div class="label">碳水化合物</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalCarb / 200) * 100, 100)" status="warning" />
            </div>
            <div class="nutrient-item">
              <div class="label">脂肪</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalFat / 60) * 100, 100)" color="#f56c6c" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <el-statistic title="摄入差值" :value="report.diff" suffix="kcal">
            <template #prefix>
              <el-icon v-if="report.diff > 0" color="red"><Top /></el-icon>
              <el-icon v-else color="green"><Bottom /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <!-- 修复点：加上冒号 :precision="1" -->
          <el-statistic title="目标体重" :value="userStore.userInfo.weight || 0" :precision="1" suffix="kg">
            <template #prefix><el-icon><Trophy /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <el-statistic title="坚持天数" :value="1" suffix="天">
             <template #prefix><el-icon><Timer /></el-icon></template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.dashboard-container {
  .welcome-section {
    margin-bottom: 25px;
    h2 { font-size: 24px; color: #303133; margin-bottom: 5px; }
    .subtitle { color: #909399; font-size: 14px; }
  }
  .chart-card {
    height: 350px;
    display: flex; flex-direction: column; justify-content: center;
    .chart-box { width: 100%; height: 260px; }
    .target-text { text-align: center; color: #909399; font-size: 14px; margin-top: -10px; }
  }
  .nutrient-card {
    height: 350px;
    .card-header { font-weight: bold; display: flex; align-items: center; gap: 5px; }
    .nutrient-item { margin-bottom: 25px; .label { margin-bottom: 5px; color: #606266; font-size: 14px; } }
  }
  .mt-20 { margin-top: 20px; }
  .mini-card { text-align: center; }
}
</style>