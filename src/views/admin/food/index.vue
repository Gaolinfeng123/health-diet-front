<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Plus, Delete } from '@element-plus/icons-vue'
import { getFoodListAPI, addFoodAPI, deleteFoodAPI } from '@/api/food'
import { ElMessage, ElMessageBox } from 'element-plus'

const tableData = ref([])
const loading = ref(false)
const total = ref(0)

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: ''
})

const dialogVisible = ref(false)
const form = reactive({ name: '', calories: 0, protein: 0, fat: 0, carb: 0 })

const currentPageCount = computed(() => tableData.value.length)
const avgCalories = computed(() => {
  if (!currentPageCount.value) return 0
  const totalCalories = tableData.value.reduce((sum: number, item: any) => sum + Number(item.calories || 0), 0)
  return Math.round(totalCalories / currentPageCount.value)
})
const pageRangeLabel = computed(() => {
  if (total.value === 0 || currentPageCount.value === 0) return '暂无数据'
  const start = (queryParams.pageNum - 1) * queryParams.pageSize + 1
  const end = Math.min(start + currentPageCount.value - 1, total.value)
  return `显示 ${start}-${end} / 共 ${total.value} 条`
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getFoodListAPI(queryParams)
    // 适配新分页结构
    const pageData = res.data || {}
    tableData.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (e) { console.error(e) } 
  finally { loading.value = false }
}

const handlePageChange = (newPage: number) => {
  queryParams.pageNum = newPage
  loadData()
}

const openAdd = () => {
  Object.assign(form, { name: '', calories: 0, protein: 0, fat: 0, carb: 0 })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name || form.calories <= 0) return ElMessage.warning('请填写正确信息')
  try {
    await addFoodAPI(form)
    ElMessage.success('添加成功')
    dialogVisible.value = false
    loadData()
  } catch (e) { console.error(e) }
}

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定删除?', '警告', { type: 'warning' })
    .then(async () => {
      await deleteFoodAPI(id)
      ElMessage.success('删除成功')
      loadData()
    })
}

onMounted(() => { loadData() })
</script>

<template>
  <div class="admin-food-container">
    <div class="hero-grid">
      <el-card shadow="never" class="hero-card controls-card">
        <div class="card-kicker">Food Database</div>
        <h2>食物管理中心</h2>
        <p>维护食材营养数据，为前台饮食记录与推荐分析提供准确基础。</p>
        <div class="header">
          <div class="left">
            <el-input
              v-model="queryParams.keyword"
              class="search-input"
              placeholder="搜索食物名称"
              clearable
              @clear="loadData"
              @keyup.enter="loadData"
            />
            <el-button type="primary" :icon="Search" @click="loadData">搜索</el-button>
          </div>
          <el-button type="success" :icon="Plus" @click="openAdd">录入新食物</el-button>
        </div>
        <div class="range-tips">{{ pageRangeLabel }}</div>
      </el-card>

      <el-card shadow="never" class="hero-card summary-card">
        <div class="stat-item">
          <span>食物总数</span>
          <b>{{ total }}</b>
        </div>
        <div class="stat-item">
          <span>当前页条目</span>
          <b>{{ currentPageCount }}</b>
        </div>
        <div class="stat-item">
          <span>平均热量</span>
          <b>{{ avgCalories }}<small>kcal</small></b>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="table-card">
      <div class="table-head">
        <h3>食物营养数据列表</h3>
        <el-tag round type="warning">{{ pageRangeLabel }}</el-tag>
      </div>
      <div class="table-scroll">
        <el-table :data="tableData" v-loading="loading" stripe class="food-table" height="100%">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="id" label="ID" width="86" />
          <el-table-column prop="name" label="名称" min-width="200" />
          <el-table-column prop="calories" label="热量" width="130">
            <template #default="s">
              <el-tag type="warning">{{s.row.calories}} kcal</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="protein" label="蛋白(g)" width="120" />
          <el-table-column prop="fat" label="脂肪(g)" width="120" />
          <el-table-column prop="carb" label="碳水(g)" width="120" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="s">
              <el-button type="danger" link :icon="Delete" @click="handleDelete(s.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-box" v-if="total > 0">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="queryParams.pageSize" @current-change="handlePageChange"/>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="录入新食物" width="460px" class="food-dialog">
      <el-form label-width="100px" size="large">
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="热量"><el-input-number v-model="form.calories" :min="0" /><span class="unit">kcal</span></el-form-item>
        <el-divider>营养素</el-divider>
        <el-form-item label="蛋白质"><el-input-number v-model="form.protein" :min="0" :precision="1" /><span class="unit">g</span></el-form-item>
        <el-form-item label="脂肪"><el-input-number v-model="form.fat" :min="0" :precision="1" /><span class="unit">g</span></el-form-item>
        <el-form-item label="碳水"><el-input-number v-model="form.carb" :min="0" :precision="1" /><span class="unit">g</span></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSubmit">确认</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.admin-food-container {
  --accent: #f97316;
  --text-main: #7c2d12;
  --text-sub: #9a3412;
  padding: 8px 6px 14px;
  min-height: calc(100vh - 118px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.hero-card {
  border-radius: 24px !important;
  border: 1px solid rgba(255, 255, 255, 0.9) !important;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.85), rgba(255, 244, 232, 0.82)) !important;
  box-shadow: 0 14px 28px rgba(251, 146, 60, 0.12) !important;
}

.controls-card {
  :deep(.el-card__body) {
    padding: 18px 20px 16px;
  }

  .card-kicker {
    font-size: 12px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
  }

  h2 {
    margin: 4px 0 6px;
    color: var(--text-main);
    font-size: 28px;
    line-height: 1.15;
    font-weight: 800;
  }

  p {
    margin: 0 0 14px;
    color: var(--text-sub);
    font-size: 14px;
  }
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.left {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 10px;
}

.search-input {
  max-width: 420px;
  width: 100%;
}

.range-tips {
  margin-top: 12px;
  font-size: 13px;
  color: #b45309;
}

.summary-card {
  :deep(.el-card__body) {
    height: 100%;
    padding: 14px;
    display: grid;
    gap: 10px;
  }

  .stat-item {
    border-radius: 16px;
    border: 1px solid rgba(255, 214, 177, 0.72);
    background: rgba(255, 255, 255, 0.86);
    padding: 12px 14px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;

    span {
      font-size: 13px;
      color: #9ca3af;
      font-weight: 600;
    }

    b {
      color: var(--text-main);
      font-size: 24px;
      line-height: 1;
      font-weight: 800;

      small {
        margin-left: 2px;
        font-size: 12px;
        font-weight: 600;
        color: #64748b;
      }
    }
  }
}

.table-card {
  flex: 1;
  min-height: 0;
  border-radius: 24px !important;
  border: 1px solid rgba(255, 255, 255, 0.92) !important;
  background: linear-gradient(150deg, rgba(255, 255, 255, 0.86), rgba(255, 248, 241, 0.84)) !important;
  box-shadow: 0 16px 30px rgba(251, 146, 60, 0.11) !important;

  :deep(.el-card__body) {
    height: 100%;
    min-height: 500px;
    display: flex;
    flex-direction: column;
    padding: 14px 16px 12px;
    gap: 10px;
  }
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  h3 {
    margin: 0;
    color: var(--text-main);
    font-size: 19px;
    font-weight: 800;
  }
}

.table-scroll {
  flex: 1;
  min-height: 360px;
}

.food-table {
  border-radius: 14px;
  overflow: hidden;
}

.unit {
  margin-left: 10px;
  color: #94a3b8;
}

.pagination-box {
  margin-top: 2px;
  display: flex;
  justify-content: flex-end;
}

.food-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }
  :deep(.el-dialog__header) {
    margin: 0;
    padding: 16px 18px 10px;
  }
  :deep(.el-dialog__body) {
    padding: 10px 18px;
  }
  :deep(.el-dialog__footer) {
    padding: 8px 18px 16px;
  }
}

@media (max-width: 1200px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    :deep(.el-card__body) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 860px) {
  .admin-food-container {
    min-height: auto;
    padding: 4px 2px 12px;
  }

  .controls-card {
    h2 {
      font-size: 24px;
    }
  }

  .header,
  .left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: none;
  }

  .summary-card {
    :deep(.el-card__body) {
      grid-template-columns: 1fr;
    }
  }

  .table-card {
    :deep(.el-card__body) {
      min-height: 420px;
      padding: 12px;
    }
  }
}
</style>
