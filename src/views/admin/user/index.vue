<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
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
const queryParams = reactive({ pageNum: 1, pageSize: 10, username: '' })
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = reactive({ id: undefined, username: '', password: '', nickname: '', role: 0 })

const adminCount = computed(() => tableData.value.filter((u: any) => u.role === 1).length)
const normalCount = computed(() => tableData.value.filter((u: any) => u.role !== 1).length)
const currentPageCount = computed(() => tableData.value.length)
const pageRangeLabel = computed(() => {
  if (total.value === 0 || currentPageCount.value === 0) return '暂无数据'
  const start = (queryParams.pageNum - 1) * queryParams.pageSize + 1
  const end = Math.min(start + currentPageCount.value - 1, total.value)
  return `显示 ${start}-${end} / 共 ${total.value} 人`
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getUserListAPI(queryParams)
    const pageData = res.data || {}
    tableData.value = pageData.records || []
    total.value = pageData.total || 0
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const handlePageChange = (newPage: number) => { queryParams.pageNum = newPage; loadData() }

const openAdd = () => { isEdit.value = false; Object.assign(form, { id: undefined, username: '', password: '', nickname: '', role: 0 }); dialogVisible.value = true }
const openEdit = (row: any) => { isEdit.value = true; Object.assign(form, { id: row.id, username: row.username, password: '', nickname: row.nickname, role: row.role }); dialogVisible.value = true }

const handleSubmit = async () => {
  if (!form.username) return ElMessage.warning('请输入用户名')
  if (!isEdit.value && !form.password) return ElMessage.warning('新增必填密码')
  try {
    const submitData: any = { ...form }
    if (isEdit.value) {
      if (!submitData.password) delete submitData.password
      await updateUserAPI(submitData)
      ElMessage.success('修改成功')
      if (submitData.id === userStore.userInfo.id && submitData.role !== 1) {
        userStore.logout(); router.push('/login'); return
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
  ElMessageBox.confirm('确认删除?', '警告', { type: 'error' }).then(async () => {
    await deleteUserAPI(id)
    ElMessage.success('删除成功')
    loadData()
  })
}

onMounted(() => loadData())
</script>

<template>
  <div class="admin-user-container">
    <div class="hero-grid">
      <el-card shadow="never" class="hero-card controls-card">
        <div class="card-kicker">User Management</div>
        <h2>用户管理中心</h2>
        <p>统一管理账号、角色与权限，快速检索并维护用户信息。</p>
        <div class="header">
          <div class="left">
            <el-input
              v-model="queryParams.username"
              class="search-input"
              placeholder="搜索用户名"
              clearable
              @clear="loadData"
              @keyup.enter="loadData"
            />
            <el-button type="primary" :icon="Search" @click="loadData">搜索</el-button>
          </div>
          <el-button type="success" :icon="Plus" @click="openAdd">新增用户</el-button>
        </div>
        <div class="range-tips">{{ pageRangeLabel }}</div>
      </el-card>

      <el-card shadow="never" class="hero-card summary-card">
        <div class="stat-item">
          <span>总用户</span>
          <b>{{ total }}</b>
        </div>
        <div class="stat-item">
          <span>管理员</span>
          <b>{{ adminCount }}</b>
        </div>
        <div class="stat-item">
          <span>普通用户</span>
          <b>{{ normalCount }}</b>
        </div>
      </el-card>
    </div>

    <el-card shadow="never" class="table-card">
      <div class="table-head">
        <h3>用户列表</h3>
        <el-tag round type="warning">{{ pageRangeLabel }}</el-tag>
      </div>
      <div class="table-scroll">
        <el-table :data="tableData" v-loading="loading" stripe class="user-table" height="100%">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column prop="id" label="ID" width="86" />
          <el-table-column prop="username" label="账号" min-width="180" />
          <el-table-column prop="nickname" label="昵称" min-width="180" />
          <el-table-column label="角色" width="130">
            <template #default="s">
              <el-tag :type="s.row.role===1?'danger':'info'">{{s.row.role===1?'管理员':'普通用户'}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="190" fixed="right">
            <template #default="s">
              <el-button type="primary" link :icon="Edit" @click="openEdit(s.row)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="handleDelete(s.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
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

    <el-dialog v-model="dialogVisible" :title="isEdit?'编辑用户':'新增用户'" width="520px" class="user-dialog">
      <el-form label-width="80px">
        <el-form-item label="账号"><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password :placeholder="isEdit?'留空不改':'必填'" /></el-form-item>
        <el-form-item label="角色"><el-radio-group v-model="form.role"><el-radio :label="0">普通用户</el-radio><el-radio :label="1">管理员</el-radio></el-radio-group></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.admin-user-container {
  --warm-1: #fff7ef;
  --warm-2: #ffe7d2;
  --accent: #f97316;
  --accent-strong: #ea580c;
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
      font-size: 26px;
      line-height: 1;
      font-weight: 800;
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

.user-table {
  border-radius: 14px;
  overflow: hidden;
}

.pagination-box {
  margin-top: 2px;
  display: flex;
  justify-content: flex-end;
}

.user-dialog {
  :deep(.el-dialog) {
    border-radius: 20px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    margin: 0;
    padding: 16px 18px 10px;
  }

  :deep(.el-dialog__body) {
    padding: 8px 18px;
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
  .admin-user-container {
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
