<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Delete, Sunrise, Sunny, Moon, Grape } from '@element-plus/icons-vue'
import { getFoodListAPI } from '@/api/food'
import { addDietRecordAPI, getDietListAPI, deleteDietRecordAPI } from '@/api/diet'
import { ElMessage, ElMessageBox } from 'element-plus'

// --- 状态定义 (修复点：显式指定类型 <any[]>) ---
const keyword = ref('')
const foodList = ref<any[]>([])      // <--- 修复了这里
const dietList = ref<any[]>([])      // <--- 修复了这里
const loading = ref(false)
const listLoading = ref(false)
const total = ref(0)          

// 分页参数 (适配后端新逻辑)
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  date: new Date().toISOString().split('T')[0]
})

// 弹窗状态
const dialogVisible = ref(false)
const currentFood = ref<any>({})
const form = reactive({ 
  mealType: 1, 
  quantity: 1, 
  date: new Date().toISOString().split('T')[0] 
})

// --- 方法 ---

// 1. 搜索
const handleSearch = async () => {
  loading.value = true
  try {
    const res = await getFoodListAPI(keyword.value)
    // 防止后端返回 null 导致报错
    foodList.value = res.data || []
  } catch (e) { 
    console.error(e) 
  } finally { 
    loading.value = false 
  }
}

// 2. 获取列表 (核心修正：从 records 取数据)
const loadDietList = async () => {
  listLoading.value = true
  try {
    const res = await getDietListAPI(queryParams)
    // 这里的结构是 res.data.records
    const pageData = res.data || {}
    dietList.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (e) { 
    console.error(e) 
  } finally { 
    listLoading.value = false 
  }
}

// 3. 翻页
const handlePageChange = (newPage: number) => {
  queryParams.pageNum = newPage
  loadDietList()
}

// 4. 打开弹窗
const openAddDialog = (food: any) => {
  currentFood.value = food
  form.mealType = 1
  form.quantity = 1
  dialogVisible.value = true
}

// 5. 提交添加
const submitDiet = async () => {
  try {
    await addDietRecordAPI({
      foodId: currentFood.value.id,
      date: form.date,
      mealType: form.mealType,
      quantity: form.quantity
    })
    ElMessage.success('添加成功')
    dialogVisible.value = false
    // 成功后刷新列表，并回到第一页
    queryParams.pageNum = 1
    loadDietList()
  } catch (e) { 
    console.error(e) 
  }
}

// 6. 删除
const handleDelete = (id: number) => {
  ElMessageBox.confirm('确认删除？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteDietRecordAPI(id)
      ElMessage.success('已删除')
      loadDietList()
    })
}

// 图标映射
const getMealIcon = (type: number) => {
  const map: Record<number, any> = { 1: Sunrise, 2: Sunny, 3: Moon, 4: Grape }
  return map[type]
}
const getMealName = (type: number) => {
  const map: Record<number, string> = { 1: '早餐', 2: '午餐', 3: '晚餐', 4: '加餐' }
  return map[type]
}

onMounted(() => {
  handleSearch()
  loadDietList()
})
</script>

<template>
  <div class="diet-container">
    <el-row :gutter="20">
      <!-- 左侧搜索 -->
      <el-col :span="14">
        <el-card shadow="never">
          <div class="header">
            <h3><el-icon><Search /></el-icon> 食物库</h3>
            <el-input 
              v-model="keyword" 
              placeholder="搜索食物 (如: 米饭)" 
              clearable 
              @keyup.enter="handleSearch" 
              @clear="handleSearch"
            >
              <template #append>
                <el-button :icon="Search" @click="handleSearch"/>
              </template>
            </el-input>
          </div>
          <el-table :data="foodList" v-loading="loading" height="500" stripe>
            <el-table-column prop="name" label="名称" />
            <el-table-column prop="calories" label="热量(kcal)" width="100" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="scope">
                <el-button type="primary" size="small" circle :icon="Plus" @click="openAddDialog(scope.row)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 右侧记录 -->
      <el-col :span="10">
        <el-card shadow="never">
          <template #header>
            <div class="flex-between">
              <span>📅 今日记录</span>
              <el-tag size="small">共 {{ total }} 条</el-tag>
            </div>
          </template>
          
          <div class="list-wrapper" v-loading="listLoading">
             <div class="list-content">
                <el-empty v-if="dietList.length === 0" description="还没吃东西" />
                <div v-for="item in dietList" :key="item.id" class="item">
                  <div class="left">
                    <el-icon :size="20" class="icon"><component :is="getMealIcon(item.mealType)"/></el-icon>
                    <div>
                      <div class="name">{{ item.foodName }}</div>
                      <div class="desc">{{ getMealName(item.mealType) }} · {{ item.quantity }}份</div>
                    </div>
                  </div>
                  <div class="right">
                    <span class="cal">{{ item.totalCalories }} kcal</span>
                    <el-button type="danger" link :icon="Delete" @click="handleDelete(item.id)" />
                  </div>
                </div>
             </div>
             
             <!-- 分页 -->
             <div class="pagination" v-if="total > 0">
               <el-pagination 
                 background layout="prev, pager, next" 
                 :total="total" 
                 :page-size="queryParams.pageSize" 
                 :current-page="queryParams.pageNum"
                 @current-change="handlePageChange"
               />
             </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 弹窗 -->
    <el-dialog v-model="dialogVisible" title="添加记录" width="350px">
      <div class="food-info">
        <h4>{{ currentFood.name }}</h4>
        <el-tag>{{ currentFood.calories }} kcal / 100g</el-tag>
      </div>
      <el-form class="mt-20" label-position="top">
        <el-form-item label="餐点">
          <el-radio-group v-model="form.mealType" size="small">
            <el-radio-button :label="1">早餐</el-radio-button>
            <el-radio-button :label="2">午餐</el-radio-button>
            <el-radio-button :label="3">晚餐</el-radio-button>
            <el-radio-button :label="4">加餐</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="份数 (1份=100g)">
          <el-input-number v-model="form.quantity" :min="1" :max="10" style="width:100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="submitDiet">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.diet-container { padding: 10px; }
.header { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap:5px;} }
.flex-between { display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
.list-wrapper { height: 500px; display: flex; flex-direction: column; }
.list-content { flex: 1; overflow-y: auto; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
.left { display: flex; align-items: center; gap: 10px; .icon { color: #409EFF; } .name { font-weight: 500; } .desc { font-size: 12px; color: #999; } }
.right { display: flex; align-items: center; gap: 10px; .cal { font-weight: bold; color: #666; } }
.pagination { margin-top: 10px; display: flex; justify-content: center; }
.food-info { text-align: center; background: #fdf6ec; padding: 10px; border-radius: 8px; h4 { margin: 0 0 5px 0; color: #E6A23C; } }
.mt-20 { margin-top: 20px; }
</style>