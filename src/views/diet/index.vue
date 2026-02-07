<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Search, Plus, Delete, Sunrise, Sunny, 
  Moon, Grape, Dish 
} from '@element-plus/icons-vue'
import { getFoodListAPI } from '@/api/food'
import { addDietRecordAPI, getDietListAPI, deleteDietRecordAPI } from '@/api/diet'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'

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
  date: new Date().toISOString().split('T')[0],
  userId: userStore.userInfo.id 
})

// --- 状态定义：弹窗控制 ---
const dialogVisible = ref(false)
const currentFood = ref<any>({})
const form = reactive({ 
  mealType: 1, 
  quantity: 1, 
  date: new Date().toISOString().split('T')[0] 
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
  const queryKeyword = route.query.keyword as string
  if (queryKeyword) {
    foodQueryParams.keyword = queryKeyword
    handleSearch()
  }
}

// 监听 URL 关键词变化
watch(() => route.query.keyword, () => {
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

onMounted(() => {
  loadFoodList()
  loadDietList()
  checkQuerySearch()
})
</script>

<template>
  <div class="diet-container">
    <el-row :gutter="25">
      
      <!-- 左侧：食物库 -->
      <el-col :span="14">
        <el-card class="glass-effect bubble-card">
          <div class="card-header-custom">
            <div class="title-group">
              <el-icon :size="24" color="#10b981"><Dish /></el-icon>
              <h3>探索食物库</h3>
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
            </div>
          </div>

          <el-table :data="foodList" v-loading="foodLoading" height="520" stripe class="custom-table">
            <el-table-column prop="name" label="食物名称" />
            <el-table-column prop="calories" label="热量" width="100">
              <template #default="s"><span class="cal-val">{{ s.row.calories }}</span> <small>kcal</small></template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center">
              <template #default="scope">
                <el-button type="primary" size="small" circle :icon="Plus" @click="openAddDialog(scope.row)" />
              </template>
            </el-table-column>
          </el-table>

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
      <el-col :span="10">
        <el-card class="glass-effect bubble-card record-card">
          <template #header>
            <div class="flex-between">
              <span class="record-title">📅 今日记录</span>
              <el-tag round type="success" effect="light">共 {{ dietTotal }} 项</el-tag>
            </div>
          </template>
          
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
.diet-container { padding-bottom: 20px; }

.bubble-card {
  border-radius: 35px !important;
  .card-header-custom {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
    .title-group { display: flex; align-items: center; gap: 10px; h3 { margin: 0; color: #1e293b; font-size: 18px; } }
    .search-box { width: 220px; }
  }
}

.custom-table {
  background: transparent !important;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  .cal-val { font-weight: bold; color: #10b981; }
  small { color: #94a3b8; }
}

.record-card {
  .flex-between { display: flex; justify-content: space-between; align-items: center; width: 100%; }
  .record-title { font-weight: bold; color: #1e293b; }
}

.list-container {
  height: 560px; display: flex; flex-direction: column;
  .scroll-area { flex: 1; overflow-y: auto; padding-right: 5px; }
}

.diet-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px; margin-bottom: 12px; background: rgba(255,255,255,0.5);
  border-radius: 20px; border: 1px solid rgba(255,255,255,0.3);
  transition: all 0.3s;
  &:hover { transform: scale(1.02); background: white; box-shadow: 0 10px 20px rgba(0,0,0,0.03); }

  .item-left {
    display: flex; align-items: center; gap: 12px;
    .icon-bubble {
      width: 40px; height: 40px; border-radius: 12px; background: #f0fdf4;
      display: flex; align-items: center; justify-content: center; color: #10b981;
    }
    .food-name { font-weight: 700; color: #1e293b; font-size: 14px; }
    .meal-tag { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  }
  .item-right {
    display: flex; align-items: center; gap: 15px;
    .calories { font-weight: 800; color: #475569; small { font-weight: normal; font-size: 10px; } }
  }
}

.pagination-box { margin-top: 20px; display: flex; justify-content: center; }

.add-preview {
  text-align: center; padding: 20px; background: #f0fdf4; border-radius: 24px;
  h4 { margin: 0 0 8px 0; color: #10b981; font-size: 18px; }
  .cal-badge { font-size: 13px; color: #059669; font-weight: 600; }
}

.meal-radios {
  display: flex; width: 100%;
  :deep(.el-radio-button__inner) { width: 100%; border-radius: 12px !important; margin: 0 2px; border: 1px solid #e2e8f0 !important; }
}

.mt-20 { margin-top: 20px; }
:deep(.el-dialog) { border-radius: 30px; overflow: hidden; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); }
</style>