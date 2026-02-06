<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { User, Lock, Upload, Edit, Plus } from '@element-plus/icons-vue' // 补上了 Plus 图标
import { useUserStore } from '@/stores/user'
import { updateUserInfoAPI, updatePasswordAPI, getUserInfoAPI } from '@/api/user'
import { uploadActionUrl } from '@/api/file'
import { ElMessage } from 'element-plus'
import type { UploadProps } from 'element-plus'

const userStore = useUserStore()
const activeTab = ref('info')

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

const bmi = computed(() => {
  if (infoForm.height && infoForm.weight) {
    const h = infoForm.height / 100
    return (infoForm.weight / (h * h)).toFixed(1)
  }
  return '--'
})

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
  } catch (e) {
    console.error(e)
  }
}

const uploadHeaders = { Authorization: userStore.token }

const handleAvatarSuccess: UploadProps['onSuccess'] = (response) => {
  const avatarUrl = response.data || response 
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

const submitInfo = async () => {
  try {
    const submitData = { ...infoForm, id: userStore.userInfo.id }
    await updateUserInfoAPI(submitData)
    ElMessage.success('资料修改成功')
    initData() 
  } catch (e) { console.error(e) }
}

// --- 提交修改密码 ---
const submitPwd = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) return ElMessage.warning('请填写完整')
  if (pwdForm.newPassword !== pwdForm.confirmPassword) return ElMessage.warning('两次新密码输入不一致')
  if (pwdForm.oldPassword === pwdForm.newPassword) return ElMessage.warning('新密码不能与旧密码相同')

  try {
    await updatePasswordAPI({
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword
    })
    ElMessage.success('密码修改成功，请重新登录')
    userStore.logout()
    location.reload()
  } catch (error: any) {
    console.log('修改密码失败') 
  } finally {
    // 无论成功失败，都关闭 Loading
  }
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="user-container">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card shadow="hover" class="profile-card">
          <div class="avatar-box">
            <el-avatar :size="100" :src="infoForm.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
            <h3>{{ infoForm.nickname }}</h3>
            <p class="role-tag">{{ userStore.userInfo.role === 1 ? '管理员' : '普通用户' }}</p>
          </div>
          <div class="stats-box">
            <div class="stat-item"><div class="val">{{ infoForm.height }}</div><div class="label">身高 (cm)</div></div>
            <div class="stat-item"><div class="val">{{ infoForm.weight }}</div><div class="label">体重 (kg)</div></div>
            <div class="stat-item"><div class="val">{{ bmi }}</div><div class="label">BMI</div></div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card shadow="hover">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本资料" name="info">
              <el-form label-position="top" size="large">
                <el-form-item label="头像">
                  <el-upload class="avatar-uploader" :action="uploadActionUrl" :headers="uploadHeaders" :show-file-list="false" :on-success="handleAvatarSuccess" :before-upload="beforeAvatarUpload">
                    <img v-if="infoForm.avatar" :src="infoForm.avatar" class="avatar" />
                    <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </el-form-item>
                <!-- 表单字段... (保持布局不变) -->
                 <el-row :gutter="20">
                  <el-col :span="12"><el-form-item label="昵称"><el-input v-model="infoForm.nickname" /></el-form-item></el-col>
                  <el-col :span="12"><el-form-item label="性别"><el-radio-group v-model="infoForm.gender"><el-radio :label="1">男</el-radio><el-radio :label="0">女</el-radio></el-radio-group></el-form-item></el-col>
                </el-row>
                <el-row :gutter="20">
                  <el-col :span="8"><el-form-item label="年龄"><el-input-number v-model="infoForm.age" :min="1" /></el-form-item></el-col>
                  <el-col :span="8"><el-form-item label="身高"><el-input-number v-model="infoForm.height" :min="50" /></el-form-item></el-col>
                  <el-col :span="8"><el-form-item label="体重"><el-input-number v-model="infoForm.weight" :min="20" /></el-form-item></el-col>
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
                <el-form-item label="旧密码"><el-input v-model="pwdForm.oldPassword" type="password" show-password /></el-form-item>
                <el-form-item label="新密码"><el-input v-model="pwdForm.newPassword" type="password" show-password /></el-form-item>
                <el-form-item label="确认新密码"><el-input v-model="pwdForm.confirmPassword" type="password" show-password /></el-form-item>
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
  .avatar-box { padding: 20px 0; h3 { margin: 10px 0 5px; } .role-tag { color: #999; font-size: 13px; margin: 0; } }
  .stats-box { display: flex; border-top: 1px solid #eee; padding-top: 20px; .stat-item { flex: 1; .val { font-weight: bold; font-size: 18px; color: #333; } .label { font-size: 12px; color: #999; } } }
}
.avatar-uploader {
  border: 1px dashed #d9d9d9; border-radius: 6px; cursor: pointer; position: relative; overflow: hidden; width: 100px; height: 100px; display: flex; justify-content: center; align-items: center;
  &:hover { border-color: #409EFF; }
}
.avatar-uploader-icon { font-size: 28px; color: #8c939d; }
.avatar { width: 100px; height: 100px; display: block; object-fit: cover; }
</style>