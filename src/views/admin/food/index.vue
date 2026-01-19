<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Delete, Dish } from '@element-plus/icons-vue'
import { getFoodListAPI, addFoodAPI, deleteFoodAPI } from '@/api/food'
import { ElMessage, ElMessageBox } from 'element-plus'

const keyword = ref('')
const tableData = ref([])
const loading = ref(false)

// 弹窗控制
const dialogVisible = ref(false)
const form = reactive({
  name: '',
  calories: 0,
  protein: 0,
  fat: 0,
  carb: 0
})

// --- 方法 ---

// 1. 加载列表
const loadData = async () => {
  loading.value = true
  try {
    const res = await getFoodListAPI(keyword.value)
    // 根据之前的经验，这里后端直接返回数组
    tableData.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 2. 打开新增弹窗
const openAdd = () => {
  form.name = ''
  form.calories = 0
  form.protein = 0
  form.fat = 0
  form.carb = 0
  dialogVisible.value = true
}

// 3. 提交新增
const handleSubmit = async () => {
  if (!form.name) return ElMessage.warning('请输入食物名称')
  if (form.calories <= 0) return ElMessage.warning('热量必须大于0')

  try {
    await addFoodAPI(form)
    ElMessage.success('食物添加成功')
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

// 4. 删除食物
const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要从数据库删除该食物吗？已有的饮食记录不会受影响。', '警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await deleteFoodAPI(id)
    ElMessage.success('删除成功')
    loadData()
  })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="admin-food-container">
    <!-- 顶部搜索 -->
    <el-card shadow="never">
      <div class="header">
        <div class="left">
          <el-input 
            v-model="keyword" 
            placeholder="搜索食物名称" 
            clearable 
            @clear="loadData"
            @keyup.enter="loadData"
            style="width: 250px"
          />
          <el-button type="primary" :icon="Search" @click="loadData">搜索</el-button>
        </div>
        <el-button type="success" :icon="Plus" @click="openAdd">录入新食物</el-button>
      </div>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never" class="mt-20">
      <el-table :data="tableData" v-loading="loading" stripe height="600">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="食物名称" min-width="150" />
        
        <el-table-column prop="calories" label="热量 (kcal)" width="120" sortable>
          <template #default="scope">
            <el-tag type="warning">{{ scope.row.calories }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="protein" label="蛋白质 (g)" width="120" />
        <el-table-column prop="fat" label="脂肪 (g)" width="120" />
        <el-table-column prop="carb" label="碳水 (g)" width="120" />

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button type="danger" link :icon="Delete" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增弹窗 -->
    <el-dialog v-model="dialogVisible" title="录入新食物" width="450px">
      <el-form label-width="100px" size="large">
        <el-form-item label="食物名称">
          <el-input v-model="form.name" placeholder="如：宫保鸡丁" />
        </el-form-item>
        
        <el-form-item label="热量">
          <el-input-number v-model="form.calories" :min="0" style="width: 150px" />
          <span class="unit">kcal / 100g</span>
        </el-form-item>

        <el-divider content-position="center">营养素 (可选)</el-divider>

        <el-form-item label="蛋白质">
          <el-input-number v-model="form.protein" :min="0" :precision="1" style="width: 150px" />
          <span class="unit">g</span>
        </el-form-item>

        <el-form-item label="脂肪">
          <el-input-number v-model="form.fat" :min="0" :precision="1" style="width: 150px" />
          <span class="unit">g</span>
        </el-form-item>

        <el-form-item label="碳水">
          <el-input-number v-model="form.carb" :min="0" :precision="1" style="width: 150px" />
          <span class="unit">g</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认录入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.admin-food-container { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; gap: 10px; }
.mt-20 { margin-top: 20px; }
.unit { margin-left: 10px; color: #999; font-size: 13px; }
</style>