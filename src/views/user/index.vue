<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { Lock, Edit, Plus, Location, Aim, Trophy, Male, Female } from '@element-plus/icons-vue'
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

const targetNameMap: Record<number, string> = {
  '-1': '减脂',
  '0': '维持健康',
  '1': '增肌',
  '2': '糖尿病控糖',
  '3': '高血压低盐',
  '4': '高血脂低脂'
}

// --- BMI 计算 ---
const bmi = computed(() => {
  if (infoForm.height && infoForm.weight) {
    const h = infoForm.height / 100
    return (infoForm.weight / (h * h)).toFixed(1)
  }
  return '--'
})

const targetLabel = computed(() => targetNameMap[infoForm.target] || '维持健康')

const bmiState = computed(() => {
  const value = Number(bmi.value)
  if (!Number.isFinite(value)) return { label: '待完善', className: 'pending' }
  if (value < 18.5) return { label: '偏瘦', className: 'light' }
  if (value < 24) return { label: '标准', className: 'normal' }
  if (value < 28) return { label: '偏高', className: 'high' }
  return { label: '超重', className: 'risk' }
})

const profileCompletion = computed(() => {
  let score = 0
  if (infoForm.nickname?.trim()) score += 20
  if (infoForm.avatar?.trim()) score += 20
  if (infoForm.age > 0) score += 15
  if (infoForm.height > 0) score += 15
  if (infoForm.weight > 0) score += 15
  if (Number.isInteger(infoForm.target)) score += 15
  return Math.min(100, score)
})

const pwdStrength = computed(() => {
  const pwd = pwdForm.newPassword || ''
  let score = 0
  if (pwd.length >= 8) score++
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^\w\s]/.test(pwd)) score++
  return score
})

const pwdStrengthMeta = computed(() => {
  if (!pwdForm.newPassword) return { label: '未输入', className: 'empty', percent: 0 }
  if (pwdStrength.value <= 1) return { label: '弱', className: 'weak', percent: 30 }
  if (pwdStrength.value <= 2) return { label: '中', className: 'medium', percent: 60 }
  if (pwdStrength.value === 3) return { label: '良好', className: 'good', percent: 82 }
  return { label: '强', className: 'strong', percent: 100 }
})

// --- 初始化：优先用 store/缓存，避免与 Layout 重复请求；保存后可传 true 强制刷新 ---
const initData = async (forceRefresh = false) => {
  try {
    let data = userStore.userInfo
    if (!forceRefresh && data?.id) {
      Object.assign(infoForm, {
        nickname: data.nickname || data.username,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight,
        target: data.target,
        avatar: data.avatar
      })
      return
    }
    if (!forceRefresh && !data?.id) {
      const cached = localStorage.getItem('userInfo')
      if (cached) {
        try {
          data = JSON.parse(cached)
          if (data?.id) {
            userStore.userInfo = data
            Object.assign(infoForm, { nickname: data.nickname || data.username, gender: data.gender, age: data.age, height: data.height, weight: data.weight, target: data.target, avatar: data.avatar })
            return
          }
        } catch (_) {}
      }
    }
    const res = await getUserInfoAPI()
    data = res.data
    userStore.userInfo = data
    localStorage.setItem('userInfo', JSON.stringify(data))
    if (data) {
      Object.assign(infoForm, {
        nickname: data.nickname || data.username,
        gender: data.gender,
        age: data.age,
        height: data.height,
        weight: data.weight,
        target: data.target,
        avatar: data.avatar
      })
    }
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
    initData(true)
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
            <p class="hello-line">智膳伴侣 Profile</p>
            <h2>{{ infoForm.nickname || '未设置昵称' }}</h2>
            <div class="meta-row">
              <el-tag round effect="dark" type="success" class="role-tag">{{ userStore.userInfo.role === 1 ? '超级管理员' : '普通用户' }}</el-tag>
              <span class="target-chip">{{ targetLabel }}</span>
              <span class="bmi-chip" :class="bmiState.className">BMI {{ bmiState.label }}</span>
            </div>
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

        <div class="hero-side">
          <div class="completion-ring" :style="{ '--deg': `${profileCompletion * 3.6}deg` }">
            <span>{{ profileCompletion }}%</span>
          </div>
          <div class="hero-side-text">
            <h4>档案完整度</h4>
            <p>补全信息后，云膳 AI 会给出更精准的饮食建议。</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 2. 底部：详细设置区域 -->
    <el-card class="settings-card glass-effect flex-fill">
      <el-tabs v-model="activeTab" class="full-tabs">
        
        <el-tab-pane label="基本资料修改" name="info">
          <el-form label-position="top" class="edit-form-full">
            <div class="info-edit-shell">
              <div class="center-col avatar-side">
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
                <div class="avatar-tip">建议上传清晰头像，帮助你在多设备下快速识别账号。</div>
                <div class="completion-mini">
                  <span>资料完整度</span>
                  <b>{{ profileCompletion }}%</b>
                </div>
                <div class="mini-stat-grid">
                  <div class="mini-stat-item">
                    <span>当前 BMI</span>
                    <b>{{ bmi }}</b>
                  </div>
                  <div class="mini-stat-item">
                    <span>年龄</span>
                    <b>{{ infoForm.age || '--' }}</b>
                  </div>
                  <div class="mini-stat-item target">
                    <span>当前目标</span>
                    <b>{{ targetLabel }}</b>
                  </div>
                </div>
              </div>

              <div class="info-panel">
                <div class="field-group">
                  <div class="group-head">
                    <h4>身份信息</h4>
                    <span>昵称与性别展示</span>
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
                          <el-radio-button :label="1">男士</el-radio-button>
                          <el-radio-button :label="0">女士</el-radio-button>
                        </el-radio-group>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>

                <div class="field-group">
                  <div class="group-head">
                    <h4>身体参数</h4>
                    <span>用于计算 BMI 与目标建议</span>
                  </div>
                  <el-row :gutter="18">
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
                </div>

                <div class="field-group field-group-target">
                  <div class="group-head">
                    <h4>健康目标</h4>
                    <span>支持代谢与慢病管理目标</span>
                  </div>
                  <el-form-item label="我的健康目标">
                    <el-radio-group v-model="infoForm.target" class="goal-radios">
                      <el-radio-button :label="-1">减脂</el-radio-button>
                      <el-radio-button :label="0">维持健康</el-radio-button>
                      <el-radio-button :label="1">增肌</el-radio-button>
                      <el-radio-button :label="2">糖尿病控糖</el-radio-button>
                      <el-radio-button :label="3">高血压低盐</el-radio-button>
                      <el-radio-button :label="4">高血脂低脂</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                </div>

                <div class="form-footer">
                  <el-button type="primary" size="large" class="primary-save-btn" :icon="Edit" :loading="loading" @click="submitInfo">保存资料修改</el-button>
                </div>
              </div>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="安全设置" name="password">
          <div class="password-wrap-full">
            <div class="password-panel">
              <div class="password-note">
                <h3>账号安全建议</h3>
                <p>建议每 30 天更新一次密码，避免与历史密码重复。</p>
                <div class="password-note-grid">
                  <span>长度至少 8 位</span>
                  <span>包含字母与数字</span>
                  <span>避免连续字符</span>
                  <span>不使用生日信息</span>
                </div>
                <div class="pwd-strength">
                  <div class="pwd-strength-top">
                    <span>新密码强度</span>
                    <b :class="pwdStrengthMeta.className">{{ pwdStrengthMeta.label }}</b>
                  </div>
                  <div class="pwd-strength-track">
                    <i :style="{ width: `${pwdStrengthMeta.percent}%` }" :class="pwdStrengthMeta.className"></i>
                  </div>
                </div>
              </div>

              <el-form label-position="top" class="password-form">
                <div class="password-field-grid">
                  <el-form-item label="旧密码">
                    <el-input v-model="pwdForm.oldPassword" type="password" show-password />
                  </el-form-item>
                  <el-form-item label="新密码">
                    <el-input v-model="pwdForm.newPassword" type="password" show-password />
                  </el-form-item>
                  <el-form-item label="确认新密码" class="password-confirm-item">
                    <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
                  </el-form-item>
                </div>
                <div class="mt-30 form-footer">
                  <el-button type="danger" size="large" class="danger-reset-btn" :icon="Lock" :loading="loading" @click="submitPwd">确认重置密码</el-button>
                </div>
              </el-form>
            </div>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.user-layout-full {
  position: relative;
  isolation: isolate;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
  font-family: 'PingFang SC', 'HarmonyOS Sans SC', 'Noto Sans SC', sans-serif;

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    pointer-events: none;
    filter: blur(2px);
  }

  &::before {
    top: -80px;
    right: -30px;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 188, 132, 0.45), transparent 72%);
    animation: float-soft 8s ease-in-out infinite;
  }

  &::after {
    left: -60px;
    bottom: 60px;
    width: 220px;
    height: 220px;
    border-radius: 28px;
    background: linear-gradient(145deg, rgba(255, 227, 196, 0.4), rgba(255, 255, 255, 0));
    transform: rotate(16deg);
  }
}

.mb-20 { margin-bottom: 20px; }
.mt-30 { margin-top: 30px; }

.profile-header-card {
  position: relative;
  overflow: hidden;
  border-radius: 32px !important;
  border: 1px solid rgba(255, 255, 255, 0.94) !important;
  background: linear-gradient(140deg, rgba(255, 243, 228, 0.84), rgba(255, 255, 255, 0.88)) !important;
  box-shadow: 0 20px 40px rgba(251, 146, 60, 0.12) !important;
  animation: slide-up 0.45s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(120deg, rgba(255, 192, 137, 0.12), transparent 44%),
      linear-gradient(300deg, rgba(255, 128, 35, 0.06), transparent 60%);
    pointer-events: none;
  }

  :deep(.el-card__body) {
    padding: 20px 24px;
  }

  .header-flex {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(300px, 1.25fr) minmax(360px, 1.5fr) 230px;
    gap: 14px;
    align-items: stretch;
  }

  .user-main,
  .user-stats,
  .hero-side {
    border-radius: 22px;
    border: 1px solid rgba(255, 224, 196, 0.76);
    background: rgba(255, 255, 255, 0.72);
    backdrop-filter: blur(8px);
  }

  .user-main {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px;
    animation: fade-in-up 0.5s ease both;

    .avatar-wrapper {
      position: relative;
      padding: 8px;
      border-radius: 50%;
      background: linear-gradient(150deg, rgba(255, 178, 120, 0.6), rgba(255, 122, 24, 0.18));
      box-shadow: 0 14px 24px rgba(255, 122, 24, 0.18);

      .gender-tag {
        position: absolute;
        right: 2px;
        bottom: 6px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        color: #fff;
        border: 2px solid #fff;

        &.male { background: #3b82f6; }
        &.female { background: #ec4899; }
      }
    }

    .user-text {
      min-width: 0;

      .hello-line {
        margin: 0 0 4px;
        font-size: 12px;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #f97316;
        font-weight: 700;
      }

      h2 {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        color: #7c2d12;
        line-height: 1.15;
      }
    }
  }

  .meta-row {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .role-tag {
    border: none !important;
    font-weight: 700;
    background: linear-gradient(120deg, #ffab5a, #ff7a18) !important;
    box-shadow: 0 8px 16px rgba(255, 122, 24, 0.22);
  }

  .target-chip,
  .bmi-chip {
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid;
  }

  .target-chip {
    color: #9a3412;
    border-color: rgba(251, 146, 60, 0.38);
    background: rgba(255, 238, 220, 0.9);
  }

  .bmi-chip {
    &.pending { color: #64748b; border-color: rgba(148, 163, 184, 0.4); background: rgba(241, 245, 249, 0.9); }
    &.light { color: #0e7490; border-color: rgba(14, 116, 144, 0.25); background: rgba(236, 254, 255, 0.88); }
    &.normal { color: #047857; border-color: rgba(4, 120, 87, 0.26); background: rgba(236, 253, 245, 0.9); }
    &.high { color: #9a3412; border-color: rgba(194, 65, 12, 0.3); background: rgba(255, 237, 213, 0.9); }
    &.risk { color: #b91c1c; border-color: rgba(185, 28, 28, 0.28); background: rgba(254, 242, 242, 0.92); }
  }

  .user-stats {
    padding: 14px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    animation: fade-in-up 0.5s ease 0.06s both;
  }

  .stat-bubble {
    border-radius: 16px;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(255, 228, 205, 0.74);
    box-shadow: 0 8px 20px rgba(148, 163, 184, 0.1);
    display: flex;
    align-items: center;
    gap: 11px;
    transition: transform 0.24s ease, box-shadow 0.24s ease;

    .el-icon {
      font-size: 20px;
      color: #f97316;
    }

    .v {
      display: flex;
      align-items: baseline;
      gap: 4px;
      flex-wrap: wrap;

      span {
        display: block;
        width: 100%;
        font-size: 12px;
        color: #94a3b8;
        font-weight: 600;
      }

      b {
        font-size: 21px;
        color: #7c2d12;
        line-height: 1;
      }

      small {
        color: #64748b;
        font-size: 12px;
      }
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 22px rgba(251, 146, 60, 0.17);
    }
  }

  .hero-side {
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    animation: fade-in-up 0.5s ease 0.12s both;
  }

  .completion-ring {
    --deg: 0deg;
    position: relative;
    width: 114px;
    height: 114px;
    border-radius: 50%;
    background: conic-gradient(#ff7a18 var(--deg), rgba(255, 216, 185, 0.45) 0deg);
    display: grid;
    place-items: center;

    &::after {
      content: '';
      position: absolute;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: #fff7ef;
      border: 1px solid rgba(255, 214, 177, 0.64);
      box-shadow: inset 0 2px 10px rgba(255, 122, 24, 0.08);
    }

    span {
      position: relative;
      z-index: 1;
      font-size: 24px;
      font-weight: 800;
      color: #c2410c;
    }
  }

  .hero-side-text {
    text-align: center;

    h4 {
      margin: 0 0 4px;
      font-size: 15px;
      color: #7c2d12;
    }

    p {
      margin: 0;
      color: #9a3412;
      line-height: 1.45;
      font-size: 12px;
    }
  }
}

.flex-fill { flex: 1; }

.settings-card {
  border-radius: 30px !important;
  border: 1px solid rgba(255, 255, 255, 0.96) !important;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.85), rgba(255, 243, 230, 0.84)) !important;
  box-shadow: 0 20px 38px rgba(251, 146, 60, 0.12) !important;
  animation: slide-up 0.52s ease;
  min-height: 580px;

  :deep(.el-card__body) {
    height: 100%;
    padding: 16px 18px;
  }

  .full-tabs {
    height: 100%;
  }

  :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }

  :deep(.el-tabs__nav-wrap::after) {
    background: rgba(255, 229, 203, 0.76);
  }

  :deep(.el-tabs__active-bar) {
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(120deg, #ffb676, #ff7a18);
  }

  :deep(.el-tabs__item) {
    height: 46px;
    line-height: 46px;
    font-size: 15px;
    font-weight: 800;
    color: #7c2d12;
    padding: 0 22px !important;
  }

  :deep(.el-tabs__item.is-active) {
    color: #ea580c;
  }

  :deep(.el-tabs__content) {
    height: calc(100% - 60px);
    min-height: 420px;
  }

  :deep(.el-tab-pane) {
    min-height: 420px;
    height: 100%;
    border-radius: 20px;
    border: 1px solid rgba(255, 235, 215, 0.88);
    background: linear-gradient(155deg, rgba(255, 255, 255, 0.86), rgba(255, 249, 241, 0.74));
    padding: 16px;
    animation: fade-in-up 0.35s ease;
  }

  :deep(.el-form-item__label) {
    font-weight: 700;
    color: #9a3412;
    margin-bottom: 8px !important;
  }

  :deep(.el-form-item) {
    margin-bottom: 14px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__wrapper) {
    border-radius: 12px;
    box-shadow: 0 0 0 1px rgba(255, 214, 177, 0.6) inset !important;
    background: rgba(255, 255, 255, 0.92);
  }

  :deep(.el-input-number) {
    width: 100%;
  }

  :deep(.el-input-number .el-input__wrapper) {
    border-radius: 12px;
  }
}

.edit-form-full {
  height: 100%;
}

.info-edit-shell {
  display: grid;
  grid-template-columns: 290px minmax(0, 1fr);
  gap: 16px;
  min-height: 388px;
  height: 100%;
}

.center-col {
  border-radius: 18px;
  border: 1px solid rgba(255, 214, 177, 0.72);
  background: linear-gradient(170deg, rgba(255, 241, 226, 0.88), rgba(255, 255, 255, 0.82));
  padding: 14px;
  height: 100%;
}

.avatar-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: fade-in-up 0.4s ease 0.05s both;

  :deep(.el-form-item) {
    margin-bottom: 0;
  }

  :deep(.el-form-item__content) {
    justify-content: center;
  }
}

.avatar-uploader-center {
  width: 172px;
  height: 172px;
  border-radius: 28px;
  border: 2px dashed rgba(255, 122, 24, 0.5);
  background: rgba(255, 255, 255, 0.88);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.24s ease;

  &:hover {
    border-color: #f97316;
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(255, 122, 24, 0.18);
  }

  .uploaded-avatar {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .uploader-icon {
    font-size: 34px;
    color: #94a3b8;
  }
}

.avatar-tip {
  margin: 2px 2px 0;
  line-height: 1.5;
  font-size: 12px;
  color: #9a3412;
}

.completion-mini {
  border-radius: 14px;
  border: 1px solid rgba(255, 209, 166, 0.74);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;

  span {
    font-size: 12px;
    color: #9ca3af;
    font-weight: 600;
  }

  b {
    font-size: 22px;
    color: #c2410c;
    line-height: 1;
  }
}

.mini-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mini-stat-item {
  border-radius: 12px;
  border: 1px solid rgba(255, 214, 177, 0.72);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px 12px;

  span {
    display: block;
    font-size: 12px;
    color: #94a3b8;
  }

  b {
    font-size: 18px;
    color: #7c2d12;
  }

  &.target {
    grid-column: 1 / -1;
  }
}

.info-panel {
  border-radius: 18px;
  border: 1px solid rgba(255, 214, 177, 0.66);
  background: rgba(255, 250, 243, 0.86);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  animation: fade-in-up 0.4s ease 0.1s both;
}

.field-group {
  border-radius: 14px;
  border: 1px solid rgba(255, 229, 203, 0.86);
  background: rgba(255, 255, 255, 0.92);
  padding: 12px 12px 2px;
}

.group-head {
  margin: 0 0 10px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed rgba(255, 214, 177, 0.7);

  h4 {
    margin: 0;
    font-size: 14px;
    color: #7c2d12;
    font-weight: 800;
  }

  span {
    font-size: 12px;
    color: #9ca3af;
  }
}

.field-group-target {
  :deep(.el-form-item) {
    margin-bottom: 6px;
  }
}

.goal-radios {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  width: 100%;

  :deep(.el-radio-button__inner) {
    border-radius: 999px !important;
    border: 1px solid #ffd8b4 !important;
    padding: 8px 14px;
    background: #fff;
    color: #7c2d12;
    transition: all 0.2s ease;
  }

  :deep(.el-radio-button__inner:hover) {
    border-color: #fb923c !important;
    color: #ea580c;
  }

  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    border-color: transparent !important;
    color: #fff;
    background: linear-gradient(120deg, #ffb676, #ff7a18) !important;
    box-shadow: 0 8px 16px rgba(255, 122, 24, 0.24);
  }
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 4px;
}

.primary-save-btn {
  min-width: 206px;
  border-radius: 14px !important;
  font-weight: 700;
  border: none !important;
  background: linear-gradient(120deg, #ffb676, #ff7a18) !important;
  box-shadow: 0 12px 20px rgba(255, 122, 24, 0.22);
}

.password-wrap-full {
  min-height: 100%;
}

.password-panel {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 14px;
  min-height: 380px;
}

.password-note {
  border-radius: 18px;
  border: 1px solid rgba(255, 214, 177, 0.76);
  background: linear-gradient(170deg, rgba(255, 240, 221, 0.84), rgba(255, 255, 255, 0.84));
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  h3 {
    margin: 0;
    font-size: 20px;
    color: #7c2d12;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #9a3412;
  }
}

.password-note-grid {
  display: grid;
  gap: 8px;

  span {
    border-radius: 10px;
    border: 1px solid rgba(255, 214, 177, 0.68);
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.88);
    color: #7c2d12;
    font-size: 13px;
  }
}

.pwd-strength {
  margin-top: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 214, 177, 0.74);
  background: rgba(255, 255, 255, 0.9);
  padding: 10px;
}

.pwd-strength-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;

  b {
    font-size: 13px;
    &.empty { color: #94a3b8; }
    &.weak { color: #dc2626; }
    &.medium { color: #ea580c; }
    &.good { color: #2563eb; }
    &.strong { color: #16a34a; }
  }
}

.pwd-strength-track {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(226, 232, 240, 0.8);

  i {
    display: block;
    height: 100%;
    border-radius: inherit;
    transition: width 0.28s ease;

    &.empty { background: #cbd5e1; }
    &.weak { background: linear-gradient(90deg, #f87171, #ef4444); }
    &.medium { background: linear-gradient(90deg, #fdba74, #f97316); }
    &.good { background: linear-gradient(90deg, #93c5fd, #2563eb); }
    &.strong { background: linear-gradient(90deg, #86efac, #16a34a); }
  }
}

.password-form {
  border-radius: 18px;
  border: 1px solid rgba(255, 214, 177, 0.68);
  background: rgba(255, 251, 246, 0.9);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.password-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}

.password-confirm-item {
  grid-column: 1 / -1;
}

.danger-reset-btn {
  min-width: 220px;
  border-radius: 14px !important;
  font-weight: 700;
  border: none !important;
  background: linear-gradient(120deg, #fb923c, #f97316) !important;
  box-shadow: 0 12px 20px rgba(249, 115, 22, 0.2);
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float-soft {
  0%,
  100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@media (max-width: 1440px) {
  .profile-header-card {
    .header-flex {
      grid-template-columns: minmax(300px, 1fr) minmax(340px, 1fr);
    }

    .hero-side {
      grid-column: 1 / -1;
      flex-direction: row;
      justify-content: flex-start;
      text-align: left;

      .hero-side-text {
        text-align: left;
      }
    }
  }
}

@media (max-width: 1200px) {
  .profile-header-card {
    :deep(.el-card__body) {
      padding: 16px;
    }

    .header-flex {
      grid-template-columns: 1fr;
    }

    .user-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .settings-card {
    min-height: 0;

    :deep(.el-tabs__content) {
      min-height: 0;
      height: auto;
    }

    :deep(.el-tab-pane) {
      min-height: 0;
    }
  }

  .info-edit-shell,
  .password-panel {
    grid-template-columns: 1fr;
    min-height: 0;
    height: auto;
  }

  .avatar-side {
    :deep(.el-form-item__content) {
      justify-content: flex-start;
    }
  }
}

@media (max-width: 960px) {
  .user-layout-full {
    min-height: auto;
  }

  .profile-header-card {
    .user-main {
      flex-direction: column;
      align-items: flex-start;
    }

    .user-stats {
      grid-template-columns: 1fr;
    }
  }

  .settings-card {
    :deep(.el-card__body) {
      padding: 12px;
    }

    :deep(.el-tab-pane) {
      padding: 12px;
    }
  }

  .mini-stat-grid,
  .password-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
