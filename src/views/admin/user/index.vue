<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Search, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { getUserListAPI, addUserAPI, updateUserAPI, deleteUserAPI } from '@/api/admin'
import { useUserStore } from '@/stores/user' // 引入 Store 用于判断是否操作自己
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const keyword = ref('')
const tableData = ref([])
const loading = ref(false)

// 弹窗控制
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
    const res = await getUserListAPI(keyword.value)
    tableData.value = res.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
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
  form.password = '' // 编辑模式默认留空
  form.nickname = row.nickname
  form.role = row.role
  dialogVisible.value = true
}

// 核心修复逻辑
const handleSubmit = async () => {
  if (!form.username) return ElMessage.warning('请输入用户名')
  if (!isEdit.value && !form.password) return ElMessage.warning('新增用户必须设置密码')

  try {
    // 构造提交数据 (复制一份，避免污染表单)
    const submitData: any = { ...form }

    if (isEdit.value) {
      // 修复 b: 如果密码为空，直接删除该字段，不传给后端，防止数据库变 null
      if (!submitData.password) {
        delete submitData.password
      }
      
      await updateUserAPI(submitData)
      ElMessage.success('修改成功')

      // 修复 c: 如果修改的是自己，且角色变了 (变成普通用户)，强制登出
      if (submitData.id === userStore.userInfo.id && submitData.role !== 1) {
        ElMessageBox.alert('您已修改自己的权限为普通用户，需要重新登录生效', '权限变更', {
          confirmButtonText: '重新登录',
          callback: () => {
            userStore.logout()
            router.push('/login')
          }
        })
        return // 中断后续刷新逻辑
      }

    } else {
      await addUserAPI(submitData)
      ElMessage.success('新增成功')
    }
    
    dialogVisible.value = false
    loadData()
  } catch (e) {
    console.error(e)
  }
}

const handleDelete = (id: number) => {
  // 防止删除自己
  if (id === userStore.userInfo.id) return ElMessage.warning('不能删除自己')

  ElMessageBox.confirm('此操作将永久删除该用户及其所有数据, 是否继续?', '警告', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'error'
  }).then(async () => {
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
            v-model="keyword" 
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
        
        <!-- 修复 a: 移除了 createTime 字段 -->

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button type="primary" link :icon="Edit" @click="openEdit(scope.row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="handleDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="500px">
      <el-form label-width="80px">
        <el-form-item label="账号">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入登录账号" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入用户昵称" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input 
            v-model="form.password" 
            type="password" 
            show-password 
            :placeholder="isEdit ? '留空则不修改密码' : '设置初始密码'" 
          />
        </el-form-item>
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
</style>