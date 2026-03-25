<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Delete, Plus, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { addFoodAPI, deleteFoodAPI, getFoodListAPI } from '@/api/food'

type FoodRow = {
  id: number
  name: string
  calories: number
  protein: number
  fat: number
  carb: number
  foodCategory: string
  giLevel: string
  sodiumMg: number
  saturatedFat: number
  fiber: number
  sugar: number
  breakfastFriendly: number
  dinnerFriendly: number
}

type FoodForm = {
  name: string
  calories: number
  protein: number
  fat: number
  carb: number
  foodCategory: string
  giLevel: string
  sodiumMg: number
  saturatedFat: number
  fiber: number
  sugar: number
  breakfastFriendly: boolean
  dinnerFriendly: boolean
}

type FoodPayload = Omit<FoodForm, 'breakfastFriendly' | 'dinnerFriendly'> & {
  breakfastFriendly: number
  dinnerFriendly: number
}

const categoryOptions = [
  { label: '主食', value: 'staple' },
  { label: '蛋白质', value: 'protein' },
  { label: '蔬菜', value: 'vegetable' },
  { label: '水果', value: 'fruit' },
  { label: '乳制品', value: 'dairy' },
  { label: '饮品', value: 'drink' },
  { label: '零食', value: 'snack' }
]

const giLevelOptions = [
  { label: '低 GI', value: 'low' },
  { label: '中 GI', value: 'medium' },
  { label: '高 GI', value: 'high' }
]

const createDefaultForm = (): FoodForm => ({
  name: '',
  calories: 0,
  protein: 0,
  fat: 0,
  carb: 0,
  foodCategory: '',
  giLevel: '',
  sodiumMg: 0,
  saturatedFat: 0,
  fiber: 0,
  sugar: 0,
  breakfastFriendly: false,
  dinnerFriendly: false
})

const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: ''
})

const tableData = ref<FoodRow[]>([])
const total = ref(0)
const loading = ref(false)
const dialogVisible = ref(false)
const dialogSubmitting = ref(false)
const form = reactive<FoodForm>(createDefaultForm())

const currentPageCount = computed(() => tableData.value.length)
const avgCalories = computed(() => {
  if (!tableData.value.length) return 0
  const totalCalories = tableData.value.reduce((sum, item) => sum + Number(item.calories || 0), 0)
  return Math.round(totalCalories / tableData.value.length)
})
const pageRangeLabel = computed(() => {
  if (!total.value || !currentPageCount.value) return '暂无数据'
  const start = (queryParams.pageNum - 1) * queryParams.pageSize + 1
  const end = Math.min(start + currentPageCount.value - 1, total.value)
  return `显示 ${start}-${end} / 共 ${total.value} 条`
})

const formatCategory = (value?: string) => categoryOptions.find(item => item.value === value)?.label || value || '-'
const formatGiLevel = (value?: string) => giLevelOptions.find(item => item.value === value)?.label || value || '-'
const isMealFriendly = (value: unknown) => Number(value) === 1

const buildPayload = (): FoodPayload => ({
  name: form.name.trim(),
  calories: Number(form.calories || 0),
  protein: Number(form.protein || 0),
  fat: Number(form.fat || 0),
  carb: Number(form.carb || 0),
  foodCategory: form.foodCategory,
  giLevel: form.giLevel,
  sodiumMg: Number(form.sodiumMg || 0),
  saturatedFat: Number(form.saturatedFat || 0),
  fiber: Number(form.fiber || 0),
  sugar: Number(form.sugar || 0),
  breakfastFriendly: form.breakfastFriendly ? 1 : 0,
  dinnerFriendly: form.dinnerFriendly ? 1 : 0
})

const resetForm = () => {
  Object.assign(form, createDefaultForm())
}

const loadData = async () => {
  loading.value = true
  try {
    const res = await getFoodListAPI({
      ...queryParams,
      keyword: queryParams.keyword.trim()
    })
    const pageData = res.data || {}
    tableData.value = pageData.records || []
    total.value = pageData.total || 0
  } finally {
    loading.value = false
  }
}

const handlePageChange = (page: number) => {
  queryParams.pageNum = page
  void loadData()
}

const openAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写食物名称')
    return
  }
  if (!form.foodCategory) {
    ElMessage.warning('请选择食物分类')
    return
  }
  if (!form.giLevel) {
    ElMessage.warning('请选择 GI 等级')
    return
  }
  if (Number(form.calories) <= 0) {
    ElMessage.warning('热量必须大于 0')
    return
  }

  dialogSubmitting.value = true
  try {
    await addFoodAPI(buildPayload())
    ElMessage.success('食物录入成功')
    dialogVisible.value = false
    queryParams.pageNum = 1
    await loadData()
  } finally {
    dialogSubmitting.value = false
  }
}

const handleDelete = async (id: number) => {
  await ElMessageBox.confirm('确定删除这条食物记录吗？', '删除确认', {
    type: 'warning'
  })
  await deleteFoodAPI(id)
  ElMessage.success('删除成功')
  await loadData()
}

onMounted(() => {
  void loadData()
})
</script>

<template>
  <div class="admin-food-container">
    <div class="hero-grid">
      <el-card shadow="never" class="hero-card controls-card">
        <div class="card-kicker">Food Database</div>
        <h2>食物管理中心</h2>
        <p>维护食材营养数据，为饮食记录、推荐和分析页面提供稳定的基础数据。</p>

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
          <span>平均热量 / 100g</span>
          <b>{{ avgCalories }}<small>kcal</small></b>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="table-card">
      <div class="table-head">
        <h3>食物营养数据列表（每 100g）</h3>
        <el-tag round type="warning">{{ pageRangeLabel }}</el-tag>
      </div>

      <div class="table-scroll">
        <el-table :data="tableData" v-loading="loading" stripe class="food-table" height="100%">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="id" label="ID" width="86" />
          <el-table-column prop="name" label="名称" min-width="180" />
          <el-table-column prop="foodCategory" label="分类" width="120">
            <template #default="{ row }">
              <el-tag effect="plain">{{ formatCategory(row.foodCategory) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="giLevel" label="GI" width="110">
            <template #default="{ row }">
              <el-tag type="success" effect="light">{{ formatGiLevel(row.giLevel) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="calories" label="热量" width="128">
            <template #default="{ row }">
              <el-tag type="warning">{{ row.calories }} kcal</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="protein" label="蛋白质(g)" width="110" />
          <el-table-column prop="fat" label="脂肪(g)" width="100" />
          <el-table-column prop="carb" label="碳水(g)" width="100" />
          <el-table-column prop="fiber" label="纤维(g)" width="100" />
          <el-table-column prop="sugar" label="糖(g)" width="96" />
          <el-table-column prop="sodiumMg" label="钠(mg)" width="106" />
          <el-table-column prop="saturatedFat" label="饱和脂肪(g)" width="126" />
          <el-table-column label="适配餐次" min-width="150">
            <template #default="{ row }">
              <span>{{ isMealFriendly(row.breakfastFriendly) ? '早餐' : '-' }} / {{ isMealFriendly(row.dinnerFriendly) ? '晚餐' : '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link :icon="Delete" @click="handleDelete(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="total > 0" class="pagination-box">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="queryParams.pageSize"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      title="录入新食物"
      width="760px"
      top="6vh"
      destroy-on-close
      class="food-dialog"
    >
      <el-form label-position="top" class="food-form-grid">
        <el-form-item label="食物名称" class="span-2">
          <el-input v-model="form.name" placeholder="例如：鸡胸肉、燕麦、低糖酸奶" />
        </el-form-item>

        <el-form-item label="食物分类">
          <el-select v-model="form.foodCategory" placeholder="选择分类">
            <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="GI 等级">
          <el-select v-model="form.giLevel" placeholder="选择 GI 等级">
            <el-option v-for="item in giLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="热量 / 100g">
          <el-input-number v-model="form.calories" :min="0" :precision="0" :step="10" controls-position="right" />
        </el-form-item>

        <div class="section-title span-2">宏量与补充营养（每 100g）</div>

        <el-form-item label="蛋白质 (g)">
          <el-input-number v-model="form.protein" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <el-form-item label="脂肪 (g)">
          <el-input-number v-model="form.fat" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <el-form-item label="碳水 (g)">
          <el-input-number v-model="form.carb" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <el-form-item label="膳食纤维 (g)">
          <el-input-number v-model="form.fiber" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <el-form-item label="糖 (g)">
          <el-input-number v-model="form.sugar" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <el-form-item label="钠 (mg)">
          <el-input-number v-model="form.sodiumMg" :min="0" :precision="1" :step="10" controls-position="right" />
        </el-form-item>

        <el-form-item label="饱和脂肪 (g)">
          <el-input-number v-model="form.saturatedFat" :min="0" :precision="1" :step="0.5" controls-position="right" />
        </el-form-item>

        <div class="section-title span-2">推荐餐次</div>

        <el-form-item label="适合早餐">
          <el-switch v-model="form.breakfastFriendly" />
        </el-form-item>

        <el-form-item label="适合晚餐">
          <el-switch v-model="form.dinnerFriendly" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogSubmitting" @click="handleSubmit">确认录入</el-button>
      </template>
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

.pagination-box {
  display: flex;
  justify-content: flex-end;
}

.food-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }

  :deep(.el-dialog__body) {
    max-height: 68vh;
    overflow-y: auto;
    padding: 12px 20px 6px;
  }

  :deep(.el-dialog__footer) {
    padding: 10px 20px 18px;
  }
}

.food-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-select),
  :deep(.el-input-number) {
    width: 100%;
  }
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  padding-top: 4px;
  margin-top: 4px;
  border-top: 1px solid rgba(251, 146, 60, 0.18);
}

.span-2 {
  grid-column: 1 / -1;
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

  .controls-card h2 {
    font-size: 24px;
  }

  .header,
  .left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    max-width: none;
  }

  .summary-card :deep(.el-card__body) {
    grid-template-columns: 1fr;
  }

  .table-card :deep(.el-card__body) {
    min-height: 420px;
    padding: 12px;
  }

  .food-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
