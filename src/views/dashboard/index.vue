<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import { getAnalysisReportAPI } from '@/api/analysis'
import { getUserInfoAPI, updateUserInfoAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { Food, Timer, Trophy, Top, Bottom, Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const loading = ref(false)

// 页面数据
const report = ref({
  totalCalories: 0,
  recommendCalories: 2000, 
  diff: 0,
  totalProtein: 0,
  totalFat: 0,
  totalCarb: 0,
  advice: '暂无建议'
})

let chartInstance: any = null
const chartRef = ref(null)

// 弹窗相关
const dialogVisible = ref(false)
const bodyForm = reactive({
  age: 0,
  height: 0,
  weight: 0,
  target: 0
})

const getTodayString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const loadData = async () => {
  loading.value = true
  try {
    const userRes = await getUserInfoAPI()
    const userData = userRes.data
    
    userStore.userInfo = userData
    localStorage.setItem('userInfo', JSON.stringify(userData))

    if (userData && userData.id) {
        const today = getTodayString()
        const reportRes = await getAnalysisReportAPI({ 
            userId: userData.id, 
            date: today 
        })
        if (reportRes.data) {
            report.value = reportRes.data
        }
    }
    initChart()
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const openUpdateDialog = () => {
  const u = userStore.userInfo
  bodyForm.age = u.age || 0
  bodyForm.height = u.height || 0
  bodyForm.weight = u.weight || 0
  bodyForm.target = u.target || 0
  dialogVisible.value = true
}

// --- 优化点2：自定义校验逻辑 ---
const handleUpdateBody = async () => {
  // 1. 年龄校验
  if (!bodyForm.age || bodyForm.age <= 0 || bodyForm.age > 120) {
    return ElMessage.warning('年龄填写不合理，请输入 1~120 之间的数字')
  }
  
  // 2. 身高校验 (例如限制 50cm - 250cm)
  if (!bodyForm.height || bodyForm.height < 50 || bodyForm.height > 250) {
    return ElMessage.warning('身高填写不合理，请输入 50~250cm 之间的数值')
  }

  // 3. 体重校验 (例如限制 20kg - 300kg)
  if (!bodyForm.weight || bodyForm.weight < 20 || bodyForm.weight > 300) {
    return ElMessage.warning('体重填写不合理，请输入 20~300kg 之间的数值')
  }

  try {
    const submitData = {
      ...userStore.userInfo, 
      age: bodyForm.age,
      height: bodyForm.height,
      weight: bodyForm.weight,
      target: bodyForm.target
    }
    
    await updateUserInfoAPI(submitData)
    ElMessage.success('身体数据已更新')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)
  
  // 优化点1：目标热量取整显示
  const targetCal = Math.round(report.value.recommendCalories || 2000)

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        min: 0,
        max: Math.max(targetCal + 500, 2500), 
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
          formatter: '{value}', // ECharts 自动显示数值，如果是小数 ECharts 也会显示小数，我们在 data 里传整数即可
          color: '#303133'
        },
        // 优化点1：传入整数
        data: [{ value: Math.round(report.value.totalCalories), name: '今日热量' }]
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
      <div class="left">
        <h2>👋 早上好，{{ userStore.userInfo.nickname || userStore.userInfo.username }}</h2>
        <p class="subtitle">{{ report.advice || '今天也要保持健康饮食哦！' }}</p>
      </div>
      <div class="right">
        <el-button type="primary" plain round :icon="Edit" @click="openUpdateDialog">
          调整身体数据 / 目标
        </el-button>
      </div>
    </div>

    <div class="main-stats">
      <el-row :gutter="20">
        <el-col :span="10">
          <el-card shadow="hover" class="chart-card">
            <div ref="chartRef" class="chart-box"></div>
            <!-- 优化点1：目标热量取整 -->
            <div class="target-text">目标: {{ Math.round(report.recommendCalories) }} kcal</div>
          </el-card>
        </el-col>

        <el-col :span="14">
          <el-card shadow="hover" class="nutrient-card">
            <template #header>
              <div class="card-header">
                <span><el-icon><Food /></el-icon> 营养摄入详情</span>
              </div>
            </template>
            
            <!-- 优化点1：营养素保留1位小数 (.toFixed(1)) -->
            
            <div class="nutrient-item">
              <div class="label">蛋白质</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalProtein / 100) * 100, 100)" status="success">
                <span>{{ Number(report.totalProtein).toFixed(1) }}g</span>
              </el-progress>
            </div>

            <div class="nutrient-item">
              <div class="label">碳水化合物</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalCarb / 200) * 100, 100)" status="warning">
                <span>{{ Number(report.totalCarb).toFixed(1) }}g</span>
              </el-progress>
            </div>

            <div class="nutrient-item">
              <div class="label">脂肪</div>
              <el-progress :text-inside="true" :stroke-width="20" :percentage="Math.min((report.totalFat / 60) * 100, 100)" color="#f56c6c">
                <span>{{ Number(report.totalFat).toFixed(1) }}g</span>
              </el-progress>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <el-row :gutter="20" class="mt-20">
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <!-- 优化点1：差值取整 -->
          <el-statistic title="摄入差值" :value="Math.round(report.diff)" suffix="kcal">
            <template #prefix>
              <el-icon v-if="report.diff > 0" color="red"><Top /></el-icon>
              <el-icon v-else color="green"><Bottom /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card shadow="hover" class="mini-card">
          <el-statistic 
            title="目标体重" 
            :value="userStore.userInfo.weight || 0" 
            :precision="1" 
            suffix="kg"
          >
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

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" title="更新身体数据" width="400px">
      <el-form label-position="top">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄 (岁)">
              <!-- 优化点2：移除了严格的 min/max 限制，改为允许输入负数然后在 submit 时拦截提示 -->
              <el-input-number v-model="bodyForm.age" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身高 (cm)">
              <el-input-number v-model="bodyForm.height" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="体重 (kg)">
          <el-input-number v-model="bodyForm.weight" :precision="1" style="width: 100%" />
        </el-form-item>

        <el-form-item label="当前目标">
          <el-radio-group v-model="bodyForm.target" style="width: 100%">
            <el-radio-button :label="-1">减脂</el-radio-button>
            <el-radio-button :label="0">维持</el-radio-button>
            <el-radio-button :label="1">增肌</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdateBody">保存并重新计算</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.dashboard-container {
  .welcome-section {
    margin-bottom: 25px;
    display: flex;
    justify-content: space-between;
    align-items: center;
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