<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Edit, Female, Lock, Male, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadProps } from 'element-plus'
import { uploadActionUrl } from '@/api/file'
import { getUserInfoAPI, updatePasswordAPI, updateUserInfoAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const activeTab = ref('info')
const loading = ref(false)

const infoForm = reactive({
  nickname: '',
  gender: 1,
  age: 0,
  height: 0,
  weight: 0,
  target: 0,
  activityLevel: 0,
  avatar: ''
})

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const targetNameMap: Record<number, string> = {
  [-1]: '减脂',
  0: '保持健康',
  1: '增肌',
  2: '糖尿病控制',
  3: '高血压控制',
  4: '高血脂控制'
}

const activityOptions = [
  { label: '久坐少动', value: 1 },
  { label: '轻量活动', value: 2 },
  { label: '中等活动', value: 3 },
  { label: '高活动量', value: 4 }
]

const activityLevelMap = Object.fromEntries(activityOptions.map((item) => [item.value, item.label]))

const normalizeActivityLevel = (value: unknown) => {
  const legacyMap: Record<string, number> = {
    sedentary: 1,
    light: 2,
    moderate: 3,
    active: 4,
    very_active: 4
  }

  if (typeof value === 'string' && legacyMap[value]) return legacyMap[value]
  const num = Number(value)
  return Number.isInteger(num) && num >= 1 && num <= 4 ? num : 0
}

const bmi = computed(() => {
  if (!infoForm.height || !infoForm.weight) return '--'
  const h = infoForm.height / 100
  return (infoForm.weight / (h * h)).toFixed(1)
})

const bmiState = computed(() => {
  const value = Number(bmi.value)
  if (!Number.isFinite(value)) return { label: '待完善', className: 'pending' }
  if (value < 18.5) return { label: '偏瘦', className: 'light' }
  if (value < 24) return { label: '标准', className: 'normal' }
  if (value < 28) return { label: '偏高', className: 'high' }
  return { label: '超重', className: 'risk' }
})

const targetLabel = computed(() => targetNameMap[infoForm.target] || '保持健康')
const activityLevelLabel = computed(() => activityLevelMap[infoForm.activityLevel] || '未设置')

const profileCompletion = computed(() => {
  let score = 0
  if (infoForm.nickname.trim()) score += 15
  if (infoForm.avatar.trim()) score += 15
  if (infoForm.age > 0) score += 15
  if (infoForm.height > 0) score += 15
  if (infoForm.weight > 0) score += 15
  if (Number.isInteger(infoForm.target)) score += 15
  if (infoForm.activityLevel > 0) score += 10
  return Math.min(100, score)
})

const pwdStrength = computed(() => {
  const pwd = pwdForm.newPassword
  let score = 0
  if (pwd.length >= 8) score += 1
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1
  if (/\d/.test(pwd)) score += 1
  if (/[^\w\s]/.test(pwd)) score += 1
  return score
})

const pwdStrengthMeta = computed(() => {
  if (!pwdForm.newPassword) return { label: '未输入', className: 'empty', percent: 0 }
  if (pwdStrength.value <= 1) return { label: '弱', className: 'weak', percent: 30 }
  if (pwdStrength.value <= 2) return { label: '中', className: 'medium', percent: 60 }
  if (pwdStrength.value === 3) return { label: '良好', className: 'good', percent: 82 }
  return { label: '强', className: 'strong', percent: 100 }
})

const assignUserInfo = (data: any) => {
  Object.assign(infoForm, {
    nickname: data?.nickname || data?.username || '',
    gender: Number(data?.gender ?? 1),
    age: Number(data?.age ?? 0),
    height: Number(data?.height ?? 0),
    weight: Number(data?.weight ?? 0),
    target: Number(data?.target ?? 0),
    activityLevel: normalizeActivityLevel(data?.activityLevel ?? data?.activity_level),
    avatar: data?.avatar || ''
  })
}

const buildProfilePayload = () => ({
  id: Number(userStore.userInfo.id),
  nickname: infoForm.nickname.trim(),
  gender: Number(infoForm.gender ?? 1),
  age: Number(infoForm.age ?? 0),
  height: Number(infoForm.height ?? 0),
  weight: Number(infoForm.weight ?? 0),
  target: Number(infoForm.target ?? 0),
  activityLevel: Number(infoForm.activityLevel ?? 0),
  avatar: infoForm.avatar || ''
})

const initData = async (forceRefresh = false) => {
  try {
    let data = userStore.userInfo
    if (!forceRefresh && data?.id) {
      assignUserInfo(data)
      return
    }

    if (!forceRefresh && !data?.id) {
      const cached = localStorage.getItem('userInfo')
      if (cached) {
        try {
          data = JSON.parse(cached)
          if (data?.id) {
            userStore.userInfo = data
            assignUserInfo(data)
            return
          }
        } catch (_) {}
      }
    }

    const res = await getUserInfoAPI()
    data = res.data
    userStore.userInfo = data
    localStorage.setItem('userInfo', JSON.stringify(data))
    assignUserInfo(data)
  } catch (error) {
    console.error(error)
    ElMessage.error('获取用户信息失败')
  }
}

const uploadHeaders = { Authorization: userStore.token }
const handleAvatarSuccess: UploadProps['onSuccess'] = (response) => {
  const avatarUrl = response.data || response
  infoForm.avatar = avatarUrl
  ElMessage.success('头像预览已更新，请点击保存资料')
}

const submitInfo = async () => {
  loading.value = true
  try {
    const payload = buildProfilePayload()
    await updateUserInfoAPI(payload)
    userStore.userInfo = { ...userStore.userInfo, ...payload, activity_level: payload.activityLevel }
    localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
    ElMessage.success('个人资料已更新')
    await initData(true)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

const submitPwd = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    ElMessage.warning('两次新密码输入不一致')
    return
  }
  if (pwdForm.oldPassword === pwdForm.newPassword) {
    ElMessage.warning('新密码不能与旧密码相同')
    return
  }

  loading.value = true
  try {
    await updatePasswordAPI({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword })
    ElMessage.success('密码修改成功，请重新登录')
    userStore.logout()
    location.reload()
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  initData()
})
</script>

<template>
  <div class="user-page">
    <el-card class="profile-header glass-effect">
      <div class="profile-main">
        <div class="profile-identity">
          <div class="avatar-wrap">
            <el-avatar
              :size="104"
              :src="infoForm.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
            />
            <span class="gender-badge" :class="infoForm.gender === 1 ? 'male' : 'female'">
              <el-icon><component :is="infoForm.gender === 1 ? Male : Female" /></el-icon>
            </span>
          </div>
          <div class="identity-copy">
            <p class="eyebrow">健康档案</p>
            <h2>{{ infoForm.nickname || '未设置昵称' }}</h2>
            <div class="identity-tags">
              <span class="tag warm">{{ targetLabel }}</span>
              <span class="tag">{{ activityLevelLabel }}</span>
              <span class="tag" :class="bmiState.className">BMI {{ bmiState.label }}</span>
            </div>
          </div>
        </div>

        <div class="profile-stats">
          <div class="stat-card">
            <span>身高</span>
            <strong>{{ infoForm.height || '--' }}</strong>
            <small>cm</small>
          </div>
          <div class="stat-card">
            <span>体重</span>
            <strong>{{ infoForm.weight || '--' }}</strong>
            <small>kg</small>
          </div>
          <div class="stat-card">
            <span>BMI</span>
            <strong>{{ bmi }}</strong>
          </div>
          <div class="stat-card">
            <span>完成度</span>
            <strong>{{ profileCompletion }}%</strong>
          </div>
        </div>
      </div>
    </el-card>

    <el-card class="settings-card glass-effect">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本资料修改" name="info">
          <div class="settings-grid">
            <div class="side-panel">
              <el-form-item label="更换头像">
                <el-upload
                  class="avatar-uploader"
                  :action="uploadActionUrl"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                >
                  <img v-if="infoForm.avatar" :src="infoForm.avatar" class="uploaded-avatar" />
                  <el-icon v-else class="uploader-icon"><Plus /></el-icon>
                </el-upload>
              </el-form-item>

              <div class="completion-panel">
                <span>账户完成度</span>
                <b>{{ profileCompletion }}%</b>
                <p>补充活动量后，推荐热量目标会更贴近真实情况。</p>
              </div>

              <div class="mini-grid">
                <div class="mini-item">
                  <span>当前 BMI</span>
                  <b>{{ bmi }}</b>
                </div>
                <div class="mini-item">
                  <span>当前目标</span>
                  <b>{{ targetLabel }}</b>
                </div>
                <div class="mini-item">
                  <span>活动量</span>
                  <b>{{ activityLevelLabel }}</b>
                </div>
              </div>
            </div>

            <el-form label-position="top" class="form-panel">
              <div class="field-group">
                <div class="group-head">
                  <h4>身份信息</h4>
                  <span>用于个人资料展示</span>
                </div>
                <el-row :gutter="18">
                  <el-col :span="12">
                    <el-form-item label="显示昵称">
                      <el-input v-model="infoForm.nickname" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="性别">
                      <el-radio-group v-model="infoForm.gender">
                        <el-radio-button :label="1">男</el-radio-button>
                        <el-radio-button :label="0">女</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div class="field-group">
                <div class="group-head">
                  <h4>身体参数</h4>
                  <span>用于计算 BMI 与推荐热量</span>
                </div>
                <el-row :gutter="18">
                  <el-col :span="8">
                    <el-form-item label="年龄">
                      <el-input-number v-model="infoForm.age" :min="1" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="身高 (cm)">
                      <el-input-number v-model="infoForm.height" :min="50" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="体重 (kg)">
                      <el-input-number v-model="infoForm.weight" :min="20" :precision="1" style="width: 100%" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div class="field-group">
                <div class="group-head">
                  <h4>健康目标与活动量</h4>
                  <span>推荐系统会同时参考目标和活动量</span>
                </div>
                <el-form-item label="我的健康目标">
                  <el-radio-group v-model="infoForm.target" class="goal-radios">
                    <el-radio-button :label="-1">减脂</el-radio-button>
                    <el-radio-button :label="0">保持健康</el-radio-button>
                    <el-radio-button :label="1">增肌</el-radio-button>
                    <el-radio-button :label="2">糖尿病控制</el-radio-button>
                    <el-radio-button :label="3">高血压控制</el-radio-button>
                    <el-radio-button :label="4">高血脂控制</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <el-form-item label="日常活动量">
                  <el-select v-model="infoForm.activityLevel" placeholder="请选择日常活动量" style="width: 100%">
                    <el-option
                      v-for="item in activityOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </div>

              <div class="form-footer">
                <el-button type="primary" size="large" :icon="Edit" :loading="loading" @click="submitInfo">
                  保存资料修改
                </el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="password">
          <div class="password-layout">
            <div class="password-note">
              <h3>账户安全建议</h3>
              <p>建议定期更新密码，并避免与历史密码重复。</p>
              <div class="strength-box">
                <div class="strength-top">
                  <span>新密码强度</span>
                  <b :class="pwdStrengthMeta.className">{{ pwdStrengthMeta.label }}</b>
                </div>
                <div class="strength-track">
                  <i :style="{ width: `${pwdStrengthMeta.percent}%` }" :class="pwdStrengthMeta.className"></i>
                </div>
              </div>
            </div>

            <el-form label-position="top" class="password-form">
              <el-form-item label="旧密码">
                <el-input v-model="pwdForm.oldPassword" type="password" show-password />
              </el-form-item>
              <el-form-item label="新密码">
                <el-input v-model="pwdForm.newPassword" type="password" show-password />
              </el-form-item>
              <el-form-item label="确认新密码">
                <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
              </el-form-item>
              <div class="form-footer">
                <el-button type="danger" size="large" :icon="Lock" :loading="loading" @click="submitPwd">
                  确认重置密码
                </el-button>
              </div>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.user-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 120px);
}

.profile-header,
.settings-card {
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.94);
  background: linear-gradient(145deg, rgba(255, 244, 232, 0.88), rgba(255, 255, 255, 0.92));
  box-shadow: 0 18px 36px rgba(251, 146, 60, 0.12);
}

.profile-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 18px;
}

.avatar-wrap {
  position: relative;
}

.gender-badge {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #fff;
  border: 3px solid #fff;
}

.gender-badge.male {
  background: #3b82f6;
}

.gender-badge.female {
  background: #ec4899;
}

.identity-copy h2 {
  margin: 4px 0 8px;
  color: #7c2d12;
  font-size: 28px;
}

.eyebrow {
  margin: 0;
  color: #c2410c;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.identity-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
  font-size: 12px;
  font-weight: 700;
}

.tag.warm {
  background: #ffedd5;
}

.tag.pending {
  background: #f1f5f9;
  color: #475569;
}

.tag.light,
.tag.normal {
  background: #ecfccb;
  color: #3f6212;
}

.tag.high,
.tag.risk {
  background: #fef2f2;
  color: #b91c1c;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(110px, 1fr));
  gap: 12px;
  flex: 1;
  min-width: 280px;
}

.stat-card {
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 237, 213, 0.95);
}

.stat-card span,
.stat-card small {
  color: #94a3b8;
  font-size: 12px;
}

.stat-card strong {
  display: block;
  margin: 10px 0 4px;
  color: #7c2d12;
  font-size: 24px;
}

.settings-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.avatar-uploader {
  width: 140px;
  height: 140px;
}

:deep(.avatar-uploader .el-upload) {
  width: 140px;
  height: 140px;
  border-radius: 28px;
  border: 1px dashed #fdba74;
  background: #fff7ed;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-avatar {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 28px;
}

.uploader-icon {
  font-size: 32px;
  color: #f97316;
}

.completion-panel,
.mini-item,
.password-note {
  border-radius: 22px;
  padding: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 237, 213, 0.95);
}

.completion-panel span,
.mini-item span {
  color: #64748b;
  font-size: 13px;
}

.completion-panel b {
  display: block;
  margin: 8px 0;
  color: #c2410c;
  font-size: 30px;
}

.completion-panel p,
.group-head span,
.password-note p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.7;
}

.mini-grid {
  display: grid;
  gap: 12px;
}

.mini-item b {
  display: block;
  margin-top: 8px;
  color: #7c2d12;
  font-size: 18px;
}

.form-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field-group {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 237, 213, 0.95);
}

.group-head {
  margin-bottom: 14px;
}

.group-head h4,
.password-note h3 {
  margin: 0 0 6px;
  color: #7c2d12;
  font-size: 18px;
}

.goal-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.goal-radios :deep(.el-radio-button__inner) {
  border-radius: 12px !important;
  border: 1px solid #e2e8f0 !important;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
}

.password-layout {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 24px;
}

.password-form {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 237, 213, 0.95);
}

.strength-box {
  margin-top: 18px;
}

.strength-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #7c2d12;
}

.strength-track {
  height: 10px;
  border-radius: 999px;
  background: #ffedd5;
  overflow: hidden;
}

.strength-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.empty {
  color: #94a3b8;
  background: #cbd5e1;
}

.weak {
  color: #b91c1c;
  background: #fb7185;
}

.medium {
  color: #b45309;
  background: #f59e0b;
}

.good {
  color: #047857;
  background: #34d399;
}

.strong {
  color: #166534;
  background: #22c55e;
}

@media (max-width: 960px) {
  .profile-stats,
  .settings-grid,
  .password-layout {
    grid-template-columns: 1fr;
  }

  .form-footer {
    justify-content: stretch;
  }

  .form-footer .el-button {
    width: 100%;
  }
}
</style>
