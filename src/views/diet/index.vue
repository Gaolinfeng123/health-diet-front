<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, Plus, Delete, Sunrise, Sunny, 
  Moon, Grape, Dish 
} from '@element-plus/icons-vue'
import { getFoodListAPI } from '@/api/food'
import { addDietRecordAPI, getDietListAPI, deleteDietRecordAPI } from '@/api/diet'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getLocalDateString } from '@/utils/date'

const userStore = useUserStore()
const route = useRoute()

// --- 状态定义：左侧食物库 ---
const foodList = ref<any[]>([])
const foodLoading = ref(false)
const foodTotal = ref(0)
const foodQueryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: ''
})

// --- 状态定义：右侧今日记录 ---
const dietList = ref<any[]>([])
const listLoading = ref(false)
const dietTotal = ref(0)
const dietQueryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  date: getLocalDateString(),
  userId: userStore.userInfo.id 
})

// --- 状态定义：弹窗控制 ---
const dialogVisible = ref(false)
const currentFood = ref<any>({})
const form = reactive({ 
  mealType: 1, 
  quantity: 1, 
  date: getLocalDateString()
})

// =======================
// 逻辑方法：食物库
// =======================

const loadFoodList = async () => {
  foodLoading.value = true
  try {
    const res = await getFoodListAPI(foodQueryParams)
    const pageData = res.data || {}
    foodList.value = pageData.records || []
    foodTotal.value = pageData.total || 0
  } catch (e) { 
    console.error(e) 
  } finally { 
    foodLoading.value = false 
  }
}

const handleSearch = () => {
  foodQueryParams.pageNum = 1
  loadFoodList()
}

const handleFoodPageChange = (newPage: number) => {
  foodQueryParams.pageNum = newPage
  loadFoodList()
}

// 响应全局搜索栏
const checkQuerySearch = () => {
  const queryKeyword = ((route.query.keyword as string) || '').trim()
  if (queryKeyword) {
    foodQueryParams.keyword = queryKeyword
    handleSearch()
  }
}

// 监听 URL 关键词变化
watch(() => route.fullPath, () => {
  checkQuerySearch()
})

// =======================
// 逻辑方法：饮食记录
// =======================

const loadDietList = async () => {
  listLoading.value = true
  try {
    const res = await getDietListAPI(dietQueryParams)
    const pageData = res.data || {}
    dietList.value = pageData.records || []
    dietTotal.value = pageData.total || 0
  } catch (e) { 
    console.error(e) 
  } finally { 
    listLoading.value = false 
  }
}

const handleDietPageChange = (newPage: number) => {
  dietQueryParams.pageNum = newPage
  loadDietList()
}

const openAddDialog = (food: any) => {
  currentFood.value = food
  form.mealType = 1
  form.quantity = 1
  dialogVisible.value = true
}

const submitDiet = async () => {
  try {
    await addDietRecordAPI({
      foodId: currentFood.value.id,
      date: form.date,
      mealType: form.mealType,
      quantity: form.quantity,
      userId: userStore.userInfo.id // 强制传递 ID 兼容管理员
    })
    ElMessage.success('记录成功！')
    dialogVisible.value = false
    dietQueryParams.pageNum = 1 // 回到第一页查看最新记录
    loadDietList()
  } catch (e) { 
    console.error(e) 
  }
}

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要删除这笔记录吗？', '提示', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消'
  }).then(async () => {
    await deleteDietRecordAPI(id)
    ElMessage.success('已删除')
    loadDietList()
  })
}

// =======================
// 辅助工具
// =======================
const getMealIcon = (type: number) => {
  const map: Record<number, any> = { 1: Sunrise, 2: Sunny, 3: Moon, 4: Grape }
  return map[type]
}
const getMealName = (type: number) => {
  const map: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' }
  return map[type]
}

const todayCalories = computed(() => {
  return dietList.value.reduce((sum, item) => sum + Number(item.totalCalories || 0), 0)
})

const coveredMeals = computed(() => {
  return new Set(dietList.value.map(item => item.mealType)).size
})

const foodPageRange = computed(() => {
  if (foodTotal.value === 0 || foodList.value.length === 0) return '暂无数据'
  const start = (foodQueryParams.pageNum - 1) * foodQueryParams.pageSize + 1
  const end = Math.min(start + foodList.value.length - 1, foodTotal.value)
  return `${start}-${end} / ${foodTotal.value}`
})

const dietPageRange = computed(() => {
  if (dietTotal.value === 0 || dietList.value.length === 0) return '暂无数据'
  const start = (dietQueryParams.pageNum - 1) * dietQueryParams.pageSize + 1
  const end = Math.min(start + dietList.value.length - 1, dietTotal.value)
  return `${start}-${end} / ${dietTotal.value}`
})

onMounted(() => {
  loadFoodList()
  loadDietList()
  checkQuerySearch()
})
</script>

<template>
  <div class="diet-container">
    <div class="overview-strip">
      <div class="overview-item">
        <span>今日总热量</span>
        <b>{{ todayCalories }}<small>kcal</small></b>
      </div>
      <div class="overview-item">
        <span>今日记录数</span>
        <b>{{ dietTotal }}</b>
      </div>
      <div class="overview-item">
        <span>覆盖餐次</span>
        <b>{{ coveredMeals }}<small>/4</small></b>
      </div>
      <div class="overview-item">
        <span>食物库条目</span>
        <b>{{ foodTotal }}</b>
      </div>
    </div>

    <el-row :gutter="20" class="diet-main-row">
      
      <!-- 左侧：食物库 -->
      <el-col :xs="24" :sm="24" :md="14" :lg="14" class="pane-col">
        <el-card class="glass-effect bubble-card food-card">
          <div class="card-header-custom">
            <div class="title-group">
              <el-icon :size="24" color="#ff7a18"><Dish /></el-icon>
              <h3>探索食物库</h3>
              <el-tag round effect="light" type="warning">当前 {{ foodPageRange }}</el-tag>
            </div>
            <div class="search-box">
              <el-input 
                v-model="foodQueryParams.keyword" 
                placeholder="搜索食物名称..." 
                clearable 
                @keyup.enter="handleSearch" 
                @clear="handleSearch"
              >
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
            </div>
          </div>

          <div class="table-shell">
            <el-table :data="foodList" v-loading="foodLoading" height="100%" stripe class="custom-table">
              <el-table-column prop="name" label="食物名称" />
              <el-table-column prop="calories" label="热量" width="120">
                <template #default="s"><span class="cal-val">{{ s.row.calories }}</span> <small>kcal</small></template>
              </el-table-column>
              <el-table-column label="操作" width="90" align="center">
                <template #default="scope">
                  <el-button type="primary" size="small" circle :icon="Plus" @click="openAddDialog(scope.row)" />
                </template>
              </el-table-column>
            </el-table>
          </div>

          <div class="pagination-box">
            <el-pagination 
              small background 
              layout="prev, pager, next" 
              :total="foodTotal" 
              :page-size="foodQueryParams.pageSize" 
              :current-page="foodQueryParams.pageNum"
              @current-change="handleFoodPageChange"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：今日饮食记录 -->
      <el-col :xs="24" :sm="24" :md="10" :lg="10" class="pane-col">
        <el-card class="glass-effect bubble-card record-card">
          <div class="record-head">
            <div class="flex-between">
              <span class="record-title">今日饮食记录</span>
              <el-tag round effect="light">当前 {{ dietPageRange }}</el-tag>
            </div>
            <div class="record-summary">
              <div class="summary-box">
                <span>总热量</span>
                <b>{{ todayCalories }}<small>kcal</small></b>
              </div>
              <div class="summary-box">
                <span>日期</span>
                <b>{{ dietQueryParams.date }}</b>
              </div>
            </div>
          </div>
          
          <div class="list-container" v-loading="listLoading">
             <div class="scroll-area">
                <el-empty v-if="dietList.length === 0" :image-size="100" description="今日尚未记录饮食" />
                <div v-for="item in dietList" :key="item.id" class="diet-item">
                  <div class="item-left">
                    <div class="icon-bubble">
                      <el-icon :size="18"><component :is="getMealIcon(item.mealType)"/></el-icon>
                    </div>
                    <div class="text-info">
                      <div class="food-name">{{ item.foodName }}</div>
                      <div class="meal-tag">{{ getMealName(item.mealType) }} · {{ item.quantity }} 份</div>
                    </div>
                  </div>
                  <div class="item-right">
                    <span class="calories">{{ item.totalCalories }} <small>kcal</small></span>
                    <el-button type="danger" link :icon="Delete" @click="handleDelete(item.id)" />
                  </div>
                </div>
             </div>
             
             <div class="pagination-box" v-if="dietTotal > 0">
               <el-pagination 
                 small background 
                 layout="prev, pager, next" 
                 :total="dietTotal" 
                 :page-size="dietQueryParams.pageSize" 
                 :current-page="dietQueryParams.pageNum"
                 @current-change="handleDietPageChange"
               />
             </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加记录对话框 -->
    <el-dialog v-model="dialogVisible" title="记录这顿美食" width="380px" class="glass-dialog">
      <div class="add-preview">
        <h4>{{ currentFood.name }}</h4>
        <div class="cal-badge">{{ currentFood.calories }} kcal / 100g</div>
      </div>
      
      <el-form label-position="top" class="mt-20">
        <el-form-item label="在什么时候吃的？">
          <el-radio-group v-model="form.mealType" size="default" class="meal-radios">
            <el-radio-button :label="1">早餐</el-radio-button>
            <el-radio-button :label="2">午餐</el-radio-button>
            <el-radio-button :label="3">晚餐</el-radio-button>
            <el-radio-button :label="4">加餐</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="大概吃了多少？(1份=100g)">
          <el-input-number v-model="form.quantity" :min="0.1" :max="20" :precision="1" style="width:100%" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button round @click="dialogVisible = false">再看看</el-button>
          <el-button round type="primary" @click="submitDiet">确认记录</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.diet-container {
  min-height: calc(100vh - 118px);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.overview-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-item {
  border-radius: 18px;
  border: 1px solid rgba(255, 214, 177, 0.72);
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.9), rgba(255, 245, 235, 0.85));
  box-shadow: 0 10px 20px rgba(251, 146, 60, 0.1);
  padding: 12px 14px;

  span {
    display: block;
    font-size: 12px;
    color: #9ca3af;
    margin-bottom: 3px;
    font-weight: 600;
  }

  b {
    font-size: 24px;
    color: #7c2d12;
    line-height: 1.1;
    font-weight: 800;

    small {
      margin-left: 3px;
      font-size: 12px;
      color: #64748b;
      font-weight: 600;
    }
  }
}

.diet-main-row {
  flex: 1;
  min-height: 0;
}

.pane-col {
  display: flex;
}

.bubble-card {
  width: 100%;
  border-radius: 30px !important;
  border: 1px solid rgba(255, 255, 255, 0.94) !important;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(255, 248, 241, 0.82)) !important;
  box-shadow: 0 16px 30px rgba(251, 146, 60, 0.11) !important;
  animation: fade-up 0.45s ease;

  :deep(.el-card__body) {
    height: 100%;
    min-height: 560px;
    display: flex;
    flex-direction: column;
    padding: 16px;
  }

  .card-header-custom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;

    .title-group {
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        margin: 0;
        color: #7c2d12;
        font-size: 18px;
      }
    }

    .search-box {
      width: min(390px, 100%);
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.food-card .table-shell {
  flex: 1;
  min-height: 320px;
}

.custom-table {
  background: transparent !important;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  .cal-val {
    font-weight: 800;
    color: #ea580c;
  }
  small { color: #94a3b8; }
}

.record-card {
  .record-head {
    margin-bottom: 12px;
  }

  .flex-between {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 10px;
  }

  .record-title {
    font-weight: 800;
    color: #7c2d12;
    font-size: 18px;
  }
}

.record-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-box {
  border-radius: 14px;
  border: 1px solid rgba(255, 214, 177, 0.7);
  background: rgba(255, 255, 255, 0.86);
  padding: 10px 12px;

  span {
    display: block;
    font-size: 12px;
    color: #9ca3af;
  }

  b {
    color: #7c2d12;
    font-size: 17px;
    font-weight: 800;

    small {
      margin-left: 2px;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }
  }
}

.list-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .scroll-area {
    flex: 1;
    min-height: 280px;
    overflow-y: auto;
    padding-right: 6px;
  }
}

.scroll-area::-webkit-scrollbar {
  width: 8px;
}

.scroll-area::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 158, 84, 0.55);
}

.scroll-area::-webkit-scrollbar-track {
  background: rgba(255, 237, 220, 0.55);
  border-radius: 999px;
}

.diet-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.72);
  border-radius: 16px;
  border: 1px solid rgba(255, 228, 205, 0.82);
  transition: all 0.26s;
  animation: fade-up 0.35s ease;

  &:hover {
    transform: translateY(-1px);
    background: #fff;
    box-shadow: 0 12px 22px rgba(255, 122, 24, 0.13);
  }

  .item-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .icon-bubble {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #fff0e1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ff7a18;
    }

    .food-name {
      font-weight: 700;
      color: #1e293b;
      font-size: 14px;
    }

    .meal-tag {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }
  }

  .item-right {
    display: flex;
    align-items: center;
    gap: 10px;

    .calories {
      font-weight: 800;
      color: #475569;

      small {
        font-weight: normal;
        font-size: 10px;
      }
    }
  }
}

.pagination-box {
  margin-top: 14px;
  display: flex;
  justify-content: center;
}

.add-preview {
  text-align: center;
  padding: 20px;
  background: #fff3e6;
  border-radius: 24px;
  h4 {
    margin: 0 0 8px 0;
    color: #c2410c;
    font-size: 18px;
  }
  .cal-badge {
    font-size: 13px;
    color: #9a3412;
    font-weight: 600;
  }
}

.meal-radios {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  gap: 6px;
  :deep(.el-radio-button__inner) {
    width: 100%;
    border-radius: 12px !important;
    margin: 0;
    border: 1px solid #e2e8f0 !important;
  }
}

.mt-20 { margin-top: 20px; }
:deep(.el-dialog) {
  border-radius: 30px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}

@media (max-width: 1200px) {
  .overview-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bubble-card {
    :deep(.el-card__body) {
      min-height: 500px;
    }
  }
}

@media (max-width: 960px) {
  .diet-container {
    min-height: auto;
  }

  .overview-strip {
    grid-template-columns: 1fr;
  }

  .bubble-card {
    margin-bottom: 12px;
    :deep(.el-card__body) {
      min-height: 420px;
      padding: 12px;
    }

    .card-header-custom {
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      .search-box {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
      }
    }
  }

  .record-summary {
    grid-template-columns: 1fr;
  }
}
</style>
