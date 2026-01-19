<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getUserListAPI, addUserAPI, updateUserAPI, deleteUserAPI } from '@/api/admin'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const tableData = ref([])
const loading = ref(false)
const total = ref(0)

// 分页查询参数
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  username: ''
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({
  id: undefined,
  username: '',
  password: '',
  nickname: '',
  role: 0
})

// --- 方法 ---

const loadData = async () => {
  loading.value = true
  try {
    const res = await getUserListAPI(queryParams)
    // 适配新分页结构
    const pageData = res.data || {}
    tableData.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 翻页
const handlePageChange = (newPage: number) => {
  queryParams.pageNum = newPage
  loadData()
}

const openAdd = () => {
  isEdit.value = false
  form.id = undefined
  form.username = ''
  form.password = ''
  form.nickname = ''
  form.role = 0
  dialogVisible.value = true
}

const openEdit = (row: any) => {
  isEdit.value = true
  form.id = row.id
  form.username = row.username
  form.password = ''
  form.nickname = row.nickname
  form.role = row.role
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!form.username) return ElMessage.warning('请输入用户名')
  if (!isEdit.value && !form.password) return ElMessage.warning('新增用户必须设置密码')

  try {
    const submitData: any = { ...form }

    if (isEdit.value) {
      if (!submitData.password) delete submitData.password
      
      await updateUserAPI(submitData)
      ElMessage.success('修改成功')

      if (submitData.id === userStore.userInfo.id && submitData.role !== 1) {
        ElMessageBox.alert('您已修改自己的权限为普通用户，需要重新登录', '权限变更', {
          callback: () => {
            userStore.logout()
            router.push('/login')
          }
        })
        return
      }
    } else {
      await addUserAPI(submitData)
      ElMessage.success('新增成功')
    }
    
    dialogVisible.value = false
    loadData()
  } catch (e) { console.error(e) }
}

const handleDelete = (id: number) => {
  if (id === userStore.userInfo.id) return ElMessage.warning('不能删除自己')
  ElMessageBox.confirm('确认删除该用户?', '警告', { type: 'error' })
    .then(async () => {
      await deleteUserAPI(id)
      ElMessage.success('删除成功')
      loadData()
    })
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="admin-user-container">
    <el-card shadow="never" class="search-card">
      <div class="header">
        <div class="left">
          <el-input 
            v-model="queryParams.username" 
            placeholder="搜索用户名" 
            clearable 
            @clear="loadData"
            @keyup.enter="loadData" 
            style="width: 200px"
          />
          <el-button type="primary" :icon="Search" @click="loadData">搜索</el-button>
        </div>
        <el-button type="success" :icon="Plus" @click="openAdd">新增用户</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="mt-20">
      <div class="table-wrapper">
        <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="username" label="账号" width="150" />
          <el-table-column prop="nickname" label="昵称" width="150" />
          <el-table-column label="角色" width="120">
            <template #default="scope">
              <el-tag v-if="scope.row.role === 1" type="danger">管理员</el-tag>
              <el-tag v-else type="info">普通用户</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button type="primary" link :icon="Edit" @click="openEdit(scope.row)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDelete(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 新增分页 -->
      <div class="pagination-box" v-if="total > 0">
        <el-pagination 
          background 
          layout="prev, pager, next" 
          :total="total"
          :page-size="queryParams.pageSize" 
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form label-width="80px">
        <el-form-item label="账号"><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空不改' : '必填'" /></el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="form.role">
            <el-radio :label="0">普通用户</el-radio>
            <el-radio :label="1">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.admin-user-container { padding: 20px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.left { display: flex; gap: 10px; }
.mt-20 { margin-top: 20px; }
.pagination-box { margin-top: 15px; display: flex; justify-content: flex-end; }
</style>