<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI } from '@/api/analysis'
import { useUserStore } from '@/stores/user'
import { formatDate } from '@/utils/format' // 稍后我们创建一个简单的日期工具
import { ElMessage } from 'element-plus'
import { Star, Food, Timer, Trophy } from '@element-plus/icons-vue'

const userStore = useUserStore()
const loading = ref(false)

// 页面数据
const report = ref({
  totalCalories: 0,      // 已摄入
  recommendCalories: 0,  // 推荐摄入
  diff: 0,               // 差值
  totalProtein: 0,
  totalFat: 0,
  totalCarb: 0,
  advice: '暂无建议'
})

// ECharts 实例
let chartInstance: any = null
const chartRef = ref(null)

// 1. 获取数据
const loadData = async () => {
  loading.value = true
  try {
    // 获取今日日期 YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    
    // 调用后端接口
    const res = await getAnalysisReportAPI({ 
        userId: userStore.userInfo.id, // 虽然后端会从Token取，但传了也无妨
        date: today 
    })
    
    report.value = res.data
    initChart() // 数据回来后更新图表
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 2. 初始化 ECharts 仪表盘
const initChart = () => {
  if (!chartRef.value) return
  
  // 如果已存在则销毁，防止内存泄漏
  if (chartInstance) {
    chartInstance.dispose()
  }

  chartInstance = echarts.init(chartRef.value)
  
  // 计算百分比 (最大100，防止爆表)
  let percent = 0
  if (report.value.recommendCalories > 0) {
    percent = Math.round((report.value.totalCalories / report.value.recommendCalories) * 100)
  }

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: report.value.recommendCalories || 2000,
        splitNumber: 5,
        itemStyle: {
          color: '#409EFF',
          shadowColor: 'rgba(0,138,255,0.45)',
          shadowBlur: 10,
          shadowOffsetX: 2,
          shadowOffsetY: 2
        },
        progress: {
          show: true,
          roundCap: true,
          width: 15
        },
        pointer: { show: false }, // 不显示指针，只显示进度条
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 15
          }
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: {
          show: true,
          fontSize: 30,
          offsetCenter: [0, '30%'],
          color: '#333'
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-20%'],
          fontSize: 40,
          fontWeight: 'bold',
          formatter: '{value}',
          color: '#409EFF'
        },
        data: [
          {
            value: report.value.totalCalories,
            name: '今日热量 (kcal)'
          }
        ]
      }
    ]
  }

  chartInstance.setOption(option)
}

// 监听窗口大小变化，自适应图表
const handleResize = () => {
  chartInstance?.resize()
}

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
    <!-- 欢迎语 -->
    <div class="welcome-section">
      <h2>👋 早上好，{{ userStore.userInfo.nickname || userStore.userInfo.username }}</h2>
      <p class="subtitle">{{ report.advice || '今天也要保持健康饮食哦！' }}</p>
    </div>

    <!-- 核心仪表盘区域 -->
    <div class="main-stats">
      <el-row :gutter="20">
        <!-- 左侧：热量仪表盘 -->
        <el-col :span="10">
          <el-card shadow="hover" class="chart-card">
            <div ref="chartRef" class="chart-box"></div>
            <div class="target-text">
              目标: {{ report.recommendCalories }} kcal
            </div>
          </el-card>
        </el-col>

        <!-- 右侧：三大营养素 -->
        <el-col :span="14">
          <el-card shadow="hover" class="nutrient-card">
            <template #header>
              <div class="card-header">
                <span><el-icon><Food /></el-icon> 营养摄入详情</span>
              </div>
            </template>
            
            <div class="nutrient-item">
              <div class="label">蛋白质 (Protein)</div>
              <el-progress 
                :text-inside="true" 
                :stroke-width="24" 
                :percentage="Math.min((report.totalProtein / 100) * 100, 100)" 
                status="success"
              >
                <span>{{ report.totalProtein }}g</span>
              </el-progress>
            </div>

            <div class="nutrient-item">
              <div class="label">碳水化合物 (Carbs)</div>
              <el-progress 
                :text-inside="true" 
                :stroke-width="24" 
                :percentage="Math.min((report.totalCarb / 200) * 100, 100)" 
                status="warning"
              >
                <span>{{ report.totalCarb }}g</span>
              </el-progress>
            </div>

            <div class="nutrient-item">
              <div class="label">脂肪 (Fat)</div>
              <el-progress 
                :text-inside="true" 
                :stroke-width="24" 
                :percentage="Math.min((report.totalFat / 60) * 100, 100)" 
                color="#f56c6c"
              >
                <span>{{ report.totalFat }}g</span>
              </el-progress>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 底部快捷数据 -->
    <el-row :gutter="20" class="mt-20">
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <el-statistic title="今日摄入差值" :value="report.diff" suffix="kcal">
            <template #prefix>
              <el-icon v-if="report.diff > 0" color="red"><Top /></el-icon>
              <el-icon v-else color="green"><Bottom /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <el-statistic title="目标体重" :value="userStore.userInfo.weight || 0" precision="1" suffix="kg">
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
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    .chart-box {
      width: 100%;
      height: 280px;
    }
    .target-text {
      text-align: center;
      color: #909399;
      font-size: 14px;
      margin-top: -20px;
    }
  }

  .nutrient-card {
    height: 350px;
    .card-header {
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .nutrient-item {
      margin-bottom: 30px;
      .label {
        margin-bottom: 8px;
        color: #606266;
        font-size: 14px;
      }
    }
  }

  .mt-20 { margin-top: 20px; }
  .mini-card { text-align: center; }
}
</style>