<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
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
    <el-card shadow="never">
      <div class="header">
        <div class="left">
          <el-input v-model="queryParams.keyword" placeholder="搜索食物" clearable @clear="loadData" @keyup.enter="loadData" style="width: 250px" />
          <el-button type="primary" :icon="Search" @click="loadData">搜索</el-button>
        </div>
        <el-button type="success" :icon="Plus" @click="openAdd">录入新食物</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="mt-20">
      <el-table :data="tableData" v-loading="loading" stripe height="600">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="calories" label="热量" width="120"><template #default="s"><el-tag type="warning">{{s.row.calories}}</el-tag></template></el-table-column>
        <el-table-column prop="protein" label="蛋白" width="100" />
        <el-table-column prop="fat" label="脂肪" width="100" />
        <el-table-column prop="carb" label="碳水" width="100" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="s"><el-button type="danger" link :icon="Delete" @click="handleDelete(s.row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-box" v-if="total > 0">
        <el-pagination background layout="prev, pager, next" :total="total" :page-size="queryParams.pageSize" @current-change="handlePageChange"/>
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" title="录入新食物" width="450px">
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
.admin-food-container { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; gap: 10px; }
.mt-20 { margin-top: 20px; }
.unit { margin-left: 10px; color: #999; }
.pagination-box { margin-top: 15px; display: flex; justify-content: flex-end; }
</style>