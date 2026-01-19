<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { User, Lock, Upload, Edit } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { updateUserInfoAPI, updatePasswordAPI, getUserInfoAPI } from '@/api/user'
import { uploadActionUrl } from '@/api/file'
import { ElMessage } from 'element-plus'
import type { UploadProps } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('info')

// --- 表单数据 ---
const infoForm = reactive({
  nickname: '',
  gender: 1,
  age: 0,
  height: 0,
  weight: 0,
  target: 0,
  avatar: ''
})

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// --- 辅助计算 ---
const bmi = computed(() => {
  if (infoForm.height && infoForm.weight) {
    const h = infoForm.height / 100
    return (infoForm.weight / (h * h)).toFixed(1)
  }
  return '--'
})

// --- 初始化 ---
const initData = async () => {
  // 即使 Store 里有，也建议从后端拉取最新数据
  try {
    const res = await getUserInfoAPI()
    const data = res.data
    // 覆盖 infoForm
    Object.assign(infoForm, {
      nickname: data.nickname || data.username, // 如果没有昵称就显示账号
      gender: data.gender,
      age: data.age,
      height: data.height,
      weight: data.weight,
      target: data.target,
      avatar: data.avatar
    })
    // 同步更新 Store
    userStore.userInfo = data
    localStorage.setItem('userInfo', JSON.stringify(data))
  } catch (e) {
    console.error(e)
  }
}

// --- 头像上传 ---
// 必须携带 Token，因为 upload 组件默认不走我们的 Axios 拦截器
const uploadHeaders = {
  Authorization: userStore.token
}

const handleAvatarSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  // 假设后端返回的是图片相对路径字符串，如 "/images/xxx.jpg"
  // 如果后端返回的是 Result 对象 {code:200, data:'...'}，请根据实际调整 response.data
  // 根据你的文档：后端直接返回 URL 字符串 或 Result 包装。
  // 通常 upload 接口返回结构是 res.data 为路径
  
  const avatarUrl = response.data || response // 兼容处理
  infoForm.avatar = avatarUrl
  ElMessage.success('头像上传成功，记得点击保存哦')
}

const beforeAvatarUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('头像必须是 JPG/PNG 格式!')
    return false
  } else if (rawFile.size / 1024 / 1024 > 2) {
    ElMessage.error('头像大小不能超过 2MB!')
    return false
  }
  return true
}

// --- 提交修改资料 ---
const submitInfo = async () => {
  try {
    // 构造提交对象，需要包含 id (虽然 infoForm 里没有，但后端 update 接口通常从 Token 取 ID，或者我们需要传 ID)
    // 根据文档 /api/user/update 接收 User 对象
    const submitData = {
      ...infoForm,
      id: userStore.userInfo.id // 补上 ID
    }
    await updateUserInfoAPI(submitData)
    ElMessage.success('资料修改成功')
    initData() // 刷新显示
  } catch (e) {
    console.error(e)
  }
}

// --- 提交修改密码 ---
const submitPwd = async () => {
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    return ElMessage.warning('两次新密码输入不一致')
  }
  try {
    await updatePasswordAPI({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    userStore.logout()
    location.reload()
  } catch (e) {
    console.error(e)
  }
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="user-container">
    <el-row :gutter="20">
      
      <!-- 左侧：个人信息卡片 -->
      <el-col :span="8">
        <el-card shadow="hover" class="profile-card">
          <div class="avatar-box">
            <el-avatar :size="100" :src="infoForm.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <h3>{{ infoForm.nickname }}</h3>
            <p class="role-tag">普通用户</p>
          </div>
          <div class="stats-box">
            <div class="stat-item">
              <div class="val">{{ infoForm.height }}</div>
              <div class="label">身高 (cm)</div>
            </div>
            <div class="stat-item">
              <div class="val">{{ infoForm.weight }}</div>
              <div class="label">体重 (kg)</div>
            </div>
            <div class="stat-item">
              <div class="val">{{ bmi }}</div>
              <div class="label">BMI</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：编辑区域 -->
      <el-col :span="16">
        <el-card shadow="hover">
          <el-tabs v-model="activeTab">
            
            <el-tab-pane label="基本资料" name="info">
              <el-form label-position="top" size="large">
                
                <el-form-item label="头像">
                  <el-upload
                    class="avatar-uploader"
                    :action="uploadActionUrl"
                    :headers="uploadHeaders"
                    :show-file-list="false"
                    :on-success="handleAvatarSuccess"
                    :before-upload="beforeAvatarUpload"
                  >
                    <img v-if="infoForm.avatar" :src="infoForm.avatar" class="avatar" />
                    <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                    <template #tip>
                      <div class="el-upload__tip">点击图片修改 (JPG/PNG, < 2MB)</div>
                    </template>
                  </el-upload>
                </el-form-item>

                <el-row :gutter="20">
                  <el-col :span="12">
                    <el-form-item label="昵称">
                      <el-input v-model="infoForm.nickname" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="性别">
                      <el-radio-group v-model="infoForm.gender">
                        <el-radio :label="1">男</el-radio>
                        <el-radio :label="0">女</el-radio>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-form-item label="年龄">
                      <el-input-number v-model="infoForm.age" :min="1" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="身高 (cm)">
                      <el-input-number v-model="infoForm.height" :min="50" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="体重 (kg)">
                      <el-input-number v-model="infoForm.weight" :min="20" />
                    </el-form-item>
                  </el-col>
                </el-row>

                <el-form-item label="当前目标">
                  <el-radio-group v-model="infoForm.target">
                    <el-radio-button :label="-1">减脂</el-radio-button>
                    <el-radio-button :label="0">维持</el-radio-button>
                    <el-radio-button :label="1">增肌</el-radio-button>
                  </el-radio-group>
                </el-form-item>

                <el-button type="primary" :icon="Edit" @click="submitInfo">保存修改</el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="修改密码" name="password">
              <el-form label-position="top" size="large" style="max-width: 400px">
                <el-form-item label="旧密码">
                  <el-input v-model="pwdForm.oldPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="新密码">
                  <el-input v-model="pwdForm.newPassword" type="password" show-password />
                </el-form-item>
                <el-form-item label="确认新密码">
                  <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
                </el-form-item>
                <el-button type="danger" :icon="Lock" @click="submitPwd">确认修改密码</el-button>
              </el-form>
            </el-tab-pane>

          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.user-container { padding: 10px; }

.profile-card {
  text-align: center;
  .avatar-box {
    padding: 20px 0;
    h3 { margin: 10px 0 5px; }
    .role-tag { color: #999; font-size: 13px; margin: 0; }
  }
  .stats-box {
    display: flex;
    border-top: 1px solid #eee;
    padding-top: 20px;
    .stat-item {
      flex: 1;
      .val { font-weight: bold; font-size: 18px; color: #333; }
      .label { font-size: 12px; color: #999; }
    }
  }
}

// 头像上传组件样式
.avatar-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover { border-color: #409EFF; }
}
.avatar-uploader-icon { font-size: 28px; color: #8c939d; }
.avatar { width: 100px; height: 100px; display: block; object-fit: cover; }
</style>