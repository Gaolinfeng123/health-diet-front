<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getAnalysisReportAPI } from '@/api/analysis'
import { useUserStore } from '@/stores/user'
import { PieChart, List, Document, Finished } from '@element-plus/icons-vue'

const userStore = useUserStore()
const loading = ref(false)
const reportData = ref<any>(null)

const loadReport = async () => {
  loading.value = true
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await getAnalysisReportAPI({ userId: userStore.userInfo.id, date: today })
    reportData.value = res.data
  } finally { loading.value = false }
}

onMounted(() => loadReport())
</script>

<template>
  <div class="report-container" v-loading="loading">
    <el-row :gutter="25">
      <el-col :span="16">
        <el-card class="glass-effect detail-card">
          <template #header><div class="title"><el-icon><Document /></el-icon> 营养深度分析报告</div></template>
          <div v-if="reportData" class="report-content">
            <div class="advice-box">
              <h4>系统评价</h4>
              <p>{{ reportData.advice }}</p>
            </div>
            
            <div class="metrics-grid">
              <div class="m-item"><span>总摄入热量</span><b>{{ Math.round(reportData.totalCalories) }} kcal</b></div>
              <div class="m-item"><span>推荐上限</span><b>{{ Math.round(reportData.recommendCalories) }} kcal</b></div>
              <div class="m-item"><span>蛋白质总量</span><b>{{ reportData.totalProtein }}g</b></div>
              <div class="m-item"><span>健康状态</span><el-tag type="success">优良</el-tag></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="glass-effect side-tip-card">
           <h3><el-icon><Finished /></el-icon> 改善建议</h3>
           <ul class="suggestion-list">
             <li>增加优质蛋白，如鸡胸肉和鱼肉。</li>
             <li>减少晚间碳水摄入，有助于睡眠。</li>
             <li>保持餐后适量运动。</li>
           </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.detail-card { min-height: 500px; .title { font-weight: bold; display: flex; align-items: center; gap: 8px; } }
.advice-box { background: rgba(16,185,129,0.05); padding: 20px; border-radius: 20px; margin-bottom: 30px; h4 { margin-top: 0; color: #059669; } p { color: #4a5568; line-height: 1.8; } }
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; .m-item { padding: 20px; background: white; border-radius: 18px; span { display: block; color: #94a3b8; font-size: 13px; margin-bottom: 5px; } b { font-size: 18px; color: #1e293b; } } }
.suggestion-list { padding-left: 20px; color: #4a5568; li { margin-bottom: 12px; font-size: 14px; } }
</style>