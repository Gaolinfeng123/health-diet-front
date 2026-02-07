<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { User, Lock, Upload, Edit, Plus, Location, Aim, Trophy, Male, Female } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { updateUserInfoAPI, updatePasswordAPI, getUserInfoAPI } from '@/api/user'
import { uploadActionUrl } from '@/api/file'
import { ElMessage } from 'element-plus'
import type { UploadProps } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('info')
const loading = ref(false)

// --- 表单数据 ---
const infoForm = reactive({
  nickname: '', gender: 1, age: 0, height: 0, weight: 0, target: 0, avatar: ''
})
const pwdForm = reactive({
  oldPassword: '', newPassword: '', confirmPassword: ''
})

// --- BMI 计算 ---
const bmi = computed(() => {
  if (infoForm.height && infoForm.weight) {
    const h = infoForm.height / 100
    return (infoForm.weight / (h * h)).toFixed(1)
  }
  return '--'
})

// --- 初始化 ---
const initData = async () => {
  try {
    const res = await getUserInfoAPI()
    const data = res.data
    Object.assign(infoForm, {
      nickname: data.nickname || data.username,
      gender: data.gender,
      age: data.age,
      height: data.height,
      weight: data.weight,
      target: data.target,
      avatar: data.avatar
    })
    userStore.userInfo = data
    localStorage.setItem('userInfo', JSON.stringify(data))
  } catch (e) { console.error(e) }
}

// --- 头像上传 ---
const uploadHeaders = { Authorization: userStore.token }
const handleAvatarSuccess: UploadProps['onSuccess'] = (response) => {
  const avatarUrl = response.data || response 
  infoForm.avatar = avatarUrl
  ElMessage.success('预览图已更新，请点击下方保存')
}

// --- 提交修改 ---
const submitInfo = async () => {
  loading.value = true
  try {
    await updateUserInfoAPI({ ...infoForm, id: userStore.userInfo.id })
    ElMessage.success('个人资料已更新')
    initData()
  } finally { loading.value = false }
}

const submitPwd = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('请填写完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次新密码输入不一致')
  if (pwdForm.oldPassword === pwdForm.newPassword) return ElMessage.warning('新密码不能与旧密码相同')

  loading.value = true
  try {
    await updatePasswordAPI({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功，请重新登录')
    userStore.logout()
    location.reload()
  } catch (e) { console.log('拦截器处理') } finally { loading.value = false }
}

onMounted(() => initData())
</script>

<template>
  <!-- 核心修复：外层容器 width: 100% 且 flex 布局 -->
  <div class="user-layout-full">
    
    <!-- 1. 顶部：个人概览卡片 -->
    <el-card class="profile-header-card glass-effect mb-20">
      <div class="header-flex">
        <div class="user-main">
          <div class="avatar-wrapper">
            <el-avatar :size="110" :src="infoForm.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <div class="gender-tag" :class="infoForm.gender === 1 ? 'male' : 'female'">
              <el-icon><component :is="infoForm.gender === 1 ? Male : Female" /></el-icon>
            </div>
          </div>
          <div class="user-text">
            <h2>{{ infoForm.nickname }}</h2>
            <el-tag round effect="dark" type="success">{{ userStore.userInfo.role === 1 ? '超级管理员' : '普通用户' }}</el-tag>
          </div>
        </div>

        <div class="user-stats">
          <div class="stat-bubble">
            <el-icon><Location /></el-icon>
            <div class="v"><span>身高</span> <b>{{ infoForm.height }}</b><small>cm</small></div>
          </div>
          <div class="stat-bubble">
            <el-icon><Aim /></el-icon>
            <div class="v"><span>体重</span> <b>{{ infoForm.weight }}</b><small>kg</small></div>
          </div>
          <div class="stat-bubble">
            <el-icon><Trophy /></el-icon>
            <div class="v"><span>BMI</span> <b>{{ bmi }}</b></div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 2. 底部：详细设置区域 -->
    <el-card class="settings-card glass-effect flex-fill">
      <el-tabs v-model="activeTab" class="full-tabs">
        
        <el-tab-pane label="基本资料修改" name="info">
          <el-form label-position="top" class="edit-form-full">
            <el-row :gutter="60">
              <!-- 左侧：头像 -->
              <el-col :span="6" class="center-col">
                <el-form-item label="更换头像">
                  <el-upload
                    class="avatar-uploader-center"
                    :action="uploadActionUrl"
                    :headers="uploadHeaders"
                    :show-file-list="false"
                    :on-success="handleAvatarSuccess"
                  >
                    <img v-if="infoForm.avatar" :src="infoForm.avatar" class="uploaded-avatar" />
                    <el-icon v-else class="uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </el-form-item>
              </el-col>

              <!-- 右侧：表单 -->
              <el-col :span="18">
                <el-row :gutter="30">
                  <el-col :span="12">
                    <el-form-item label="显示昵称">
                      <el-input v-model="infoForm.nickname" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="性别">
                      <el-radio-group v-model="infoForm.gender">
                        <el-radio-button :label="1">男士</el-radio-button>
                        <el-radio-button :label="0">女士</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="30">
                  <el-col :span="8">
                    <el-form-item label="年龄 (岁)">
                      <el-input-number v-model="infoForm.age" :min="1" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="实时身高 (cm)">
                      <el-input-number v-model="infoForm.height" :min="50" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="实时体重 (kg)">
                      <el-input-number v-model="infoForm.weight" :min="20" :precision="1" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="我的健康目标">
                  <el-radio-group v-model="infoForm.target">
                    <el-radio-button :label="-1">减脂</el-radio-button>
                    <el-radio-button :label="0">维持健康</el-radio-button>
                    <el-radio-button :label="1">增肌</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <div class="form-footer">
                  <el-button type="primary" size="large" :icon="Edit" :loading="loading" @click="submitInfo">保存资料修改</el-button>
                </div>
              </el-col>
            </el-row>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="password">
          <div class="password-wrap-full">
            <el-form label-position="top" style="max-width: 500px; margin: 40px auto;">
              <el-form-item label="旧密码">
                <el-input v-model="pwdForm.oldPassword" type="password" show-password />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="pwdForm.newPassword" type="password" show-password />
              </el-form-item>
              <el-form-item label="确认新密码">
                <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
              </el-form-item>
              <div class="mt-30 center-text">
                <el-button type="danger" size="large" :icon="Lock" :loading="loading" @click="submitPwd">确认重置密码</el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
/* 核心布局修复：不再限制宽度 */
.user-layout-full {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px); /* 减去导航栏高度 */
}

.mb-20 { margin-bottom: 20px; }
.mt-30 { margin-top: 30px; }
.center-text { text-align: center; }

/* 顶部资料卡铺满 */
.profile-header-card {
  padding: 10px 40px;
  .header-flex {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .user-main {
    display: flex;
    align-items: center;
    gap: 30px;
    .avatar-wrapper {
      position: relative;
      .gender-tag {
        position: absolute; bottom: 5px; right: 5px;
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: white; border: 2.5px solid white; z-index: 2;
        &.male { background: #60a5fa; }
        &.female { background: #f472b6; }
      }
    }
    .user-text h2 { margin: 0 0 10px 0; font-size: 28px; font-weight: 800; color: #1e293b; }
  }

  .user-stats {
    display: flex;
    gap: 20px;
    .stat-bubble {
      display: flex; align-items: center; gap: 15px;
      padding: 15px 30px; background: rgba(255,255,255,0.4);
      border-radius: 24px; border: 1px solid rgba(255,255,255,0.5);
      .el-icon { font-size: 24px; color: #10b981; }
      .v {
        span { display: block; font-size: 12px; color: #94a3b8; font-weight: 600; }
        b { font-size: 22px; color: #1e293b; }
        small { font-size: 13px; margin-left: 3px; color: #64748b; }
      }
    }
  }
}

/* 底部设置卡铺满并填充高度 */
.flex-fill {
  flex: 1; /* 让下方卡片自动撑满剩余垂直空间 */
}

.settings-card {
  padding: 15px 40px;
  .edit-form-full { padding: 30px 0; }
  .center-col {
    display: flex; flex-direction: column; align-items: center; 
    border-right: 1px solid rgba(0,0,0,0.05);
  }
}

/* 头像上传器 */
.avatar-uploader-center {
  width: 160px; height: 160px;
  border: 2px dashed rgba(16, 185, 129, 0.3);
  border-radius: 30px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.3s; overflow: hidden;
  &:hover { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
  .uploaded-avatar { width: 100%; height: 100%; object-fit: cover; }
  .uploader-icon { font-size: 36px; color: #94a3b8; }
}

/* Tabs 全宽美化 */
:deep(.el-tabs__header) { margin-bottom: 30px; }
:deep(.el-tabs__item) { 
  font-size: 17px; font-weight: 700; height: 60px; line-height: 60px; 
  padding: 0 40px !important;
}
</style>