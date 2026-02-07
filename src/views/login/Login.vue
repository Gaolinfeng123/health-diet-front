<script setup lang="ts">
import { ref, reactive, computed, onUnmounted } from 'vue'
import { User, Lock, ArrowLeft, ArrowRight, Check, Close, Picture } from '@element-plus/icons-vue'
import { loginAPI, registerAPI, getCaptchaAPI } from '@/api/user'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// --- 状态控制 ---
const isLogin = ref(true)       
const activeStep = ref(0)       
const loading = ref(false)
const countdown = ref(3)        
let timer: any = null           

// --- 验证码相关 ---
const captchaBase64 = ref('')   
const captchaKey = ref('')      
const loginNeedCaptcha = ref(false) 

// --- 表单数据 ---
const form = reactive({
  username: '', password: '', confirmPassword: '',
  gender: 1, age: 25, height: 175, weight: 70, target: 0,
  captchaCode: ''
})

// --- 辅助显示 ---
const targetLabel = computed(() => {
  const map: Record<number, string> = { '-1': '减脂', '0': '维持', '1': '增肌' }
  return map[form.target]
})

// --- 逻辑方法 ---

const refreshCaptcha = async () => {
  try {
    const res = await getCaptchaAPI()
    captchaKey.value = res.data.key
    captchaBase64.value = res.data.image
    form.captchaCode = ''
  } catch (e) { console.error('验证码获取失败') }
}

const toggleMode = () => {
  isLogin.value = !isLogin.value
  activeStep.value = 0
  loginNeedCaptcha.value = false
}

const handleLogin = async () => {
  if (!form.username || !form.password) return ElMessage.warning('请输入账号密码')
  if (loginNeedCaptcha.value && !form.captchaCode) return ElMessage.warning('请输入验证码')

  loading.value = true
  try {
    const loginData = {
      username: form.username,
      password: form.password,
      ...(loginNeedCaptcha.value ? { captchaKey: captchaKey.value, captchaCode: form.captchaCode } : {})
    }
    const res = await loginAPI(loginData)
    userStore.setLoginInfo({ username: form.username }, res.data)
    ElMessage.success('欢迎回来！🥗')
    router.push('/')
  } catch (error: any) {
    if (error.data?.needCaptcha) {
      loginNeedCaptcha.value = true
      refreshCaptcha()
    } else if (loginNeedCaptcha.value) {
      refreshCaptcha()
    }
  } finally { loading.value = false }
}

const nextStep = () => {
  if (activeStep.value === 0) {
    if (!form.username || !form.password) return ElMessage.warning('请填写完整账号')
    if (form.password.length < 6) return ElMessage.warning('密码需大于6位')
    if (form.password !== form.confirmPassword) return ElMessage.warning('两次密码不一致')
  }
  activeStep.value++
  if (activeStep.value === 2) refreshCaptcha() // 进入最后确认页时刷验证码
}

const handleRegisterSubmit = async () => {
  if (!form.captchaCode) return ElMessage.warning('请输入验证码')
  loading.value = true
  try {
    const registerData = { ...form, captchaKey: captchaKey.value }
    await registerAPI(registerData)
    activeStep.value = 3
    startCountdown()
  } catch (e) {
    refreshCaptcha()
    if (activeStep.value !== 3) activeStep.value = 0 // 出错回退到第一步改用户名
  } finally { loading.value = false }
}

const startCountdown = () => {
  countdown.value = 3
  timer = setInterval(async () => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      await handleLogin()
    }
  }, 1000)
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="login-page">
    <!-- 装饰背景球 -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>

    <div class="glass-login-card" :class="{ 'register-mode': !isLogin }">
      <!-- 左侧：品牌展示 -->
      <div class="brand-side">
        <div class="logo-area">
          <div class="logo-icon">HD</div>
          <h1>Health Diet</h1>
        </div>
        <p class="slogan">记录你的每一份自律，<br/>遇见更美好的自己。</p>
        <!-- 复用之前的侧边栏插画，保持一致性 -->
        <img src="@/assets/side-health.png" class="brand-img" />
      </div>

      <!-- 右侧：交互表单 -->
      <div class="form-side">
        <transition name="fade" mode="out-in">
          <!-- 登录视图 -->
          <div v-if="isLogin" class="login-view" key="login">
            <h2>欢迎登录</h2>
            <el-form label-position="top">
              <el-form-item>
                <el-input v-model="form.username" placeholder="账号" :prefix-icon="User" class="capsule-input" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password class="capsule-input" @keyup.enter="handleLogin"/>
              </el-form-item>
              
              <!-- 登录验证码（熔断触发） -->
              <div v-if="loginNeedCaptcha" class="captcha-row mb-20">
                <el-input v-model="form.captchaCode" placeholder="验证码" :prefix-icon="Picture" />
                <img :src="captchaBase64" @click="refreshCaptcha" class="captcha-img" />
              </div>

              <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">立即登录</el-button>
            </el-form>
            <div class="mode-switch">
              没有账号？<el-button link type="primary" @click="toggleMode">去注册</el-button>
            </div>
          </div>

          <!-- 注册视图 -->
          <div v-else class="register-view" key="register">
            <h2>创建健康档案</h2>
            
            <el-steps :active="activeStep" finish-status="success" align-center class="custom-steps">
              <el-step title="账号" />
              <el-step title="身体" />
              <el-step title="验证" />
            </el-steps>

            <!-- 步骤0: 账号设置 -->
            <div v-if="activeStep === 0" class="step-content">
              <el-form label-position="top">
                <el-form-item><el-input v-model="form.username" placeholder="设置账号" :prefix-icon="User" /></el-form-item>
                <el-form-item><el-input v-model="form.password" type="password" placeholder="设置密码" :prefix-icon="Lock" show-password /></el-form-item>
                <el-form-item><el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" :prefix-icon="Lock" /></el-form-item>
                <el-button type="primary" class="submit-btn" @click="nextStep">下一步 <el-icon><ArrowRight /></el-icon></el-button>
              </el-form>
            </div>

            <!-- 步骤1: 身体指标 -->
            <div v-if="activeStep === 1" class="step-content">
              <div class="form-grid">
                <div class="grid-row">
                  <span>性别</span>
                  <el-radio-group v-model="form.gender">
                    <el-radio-button :label="1">男士</el-radio-button>
                    <el-radio-button :label="0">女士</el-radio-button>
                  </el-radio-group>
                </div>
                <div class="grid-row">
                  <span>年龄</span>
                  <el-input-number v-model="form.age" :min="1" />
                </div>
                <div class="grid-row">
                  <span>身高(cm)</span>
                  <el-input-number v-model="form.height" :min="50" />
                </div>
                <div class="grid-row">
                  <span>体重(kg)</span>
                  <el-input-number v-model="form.weight" :min="20" :precision="1" />
                </div>
              </div>
              <div class="btn-group mt-20">
                <el-button round @click="activeStep--">上一步</el-button>
                <el-button type="primary" round @click="nextStep">下一步</el-button>
              </div>
            </div>

            <!-- 步骤2: 目标与验证 -->
            <div v-if="activeStep === 2" class="step-content">
              <el-form label-position="top">
                <el-form-item label="您的目标">
                  <el-radio-group v-model="form.target" style="width:100%">
                    <el-radio-button :label="-1">减脂</el-radio-button>
                    <el-radio-button :label="0">维持</el-radio-button>
                    <el-radio-button :label="1">增肌</el-radio-button>
                  </el-radio-group>
                </el-form-item>
                <div class="captcha-row mb-20">
                  <el-input v-model="form.captchaCode" placeholder="输入验证码" />
                  <img :src="captchaBase64" @click="refreshCaptcha" class="captcha-img" />
                </div>
                <div class="btn-group">
                  <el-button round @click="activeStep--">上一步</el-button>
                  <el-button type="success" round @click="handleRegisterSubmit" :loading="loading">确认注册</el-button>
                </div>
              </el-form>
            </div>

            <!-- 步骤3: 成功 -->
            <div v-if="activeStep === 3" class="success-view">
              <div class="check-icon"><el-icon><Check /></el-icon></div>
              <h3>注册成功！</h3>
              <p>{{ countdown }} 秒后自动进入系统...</p>
              <el-button type="primary" @click="handleLogin">立即开始</el-button>
            </div>

            <div class="mode-switch" v-if="activeStep < 3">
              已有账号？<el-button link type="primary" @click="toggleMode">去登录</el-button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  height: 100vh; width: 100vw;
  display: flex; justify-content: center; align-items: center;
  position: relative; overflow: hidden;
  /* 已经在 style.css 定义了 body 背景，这里只需作为容器 */
}

/* 装饰背景球 */
.blob {
  position: absolute; border-radius: 50%; filter: blur(60px); z-index: 1; opacity: 0.6;
}
.blob-1 { width: 400px; height: 400px; background: #34d399; top: -100px; left: -100px; }
.blob-2 { width: 300px; height: 300px; background: #60a5fa; bottom: -50px; right: -50px; }

.glass-login-card {
  width: 900px; height: 550px;
  display: flex; z-index: 10;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(25px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 40px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.5s ease;

  &.register-mode { height: 650px; }
}

.brand-side {
  width: 40%; background: rgba(16, 185, 129, 0.05);
  padding: 50px; display: flex; flex-direction: column; justify-content: center;
  border-right: 1px solid rgba(255, 255, 255, 0.3);

  .logo-area {
    display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
    .logo-icon { width: 40px; height: 40px; background: #10b981; border-radius: 12px; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    h1 { font-size: 24px; color: #10b981; margin: 0; }
  }
  .slogan { font-size: 18px; color: #4a5568; line-height: 1.6; font-weight: 500; }
  .brand-img { width: 120%; margin-left: -10%; margin-top: 30px; filter: drop-shadow(0 15px 15px rgba(0,0,0,0.05)); }
}

.form-side {
  width: 60%; padding: 50px; display: flex; flex-direction: column; justify-content: center;
  h2 { font-size: 28px; color: #1e293b; margin-bottom: 30px; text-align: center; }
}

.submit-btn {
  width: 100%; height: 50px; border-radius: 18px !important; font-size: 16px; font-weight: bold;
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%) !important;
  border: none; margin-top: 10px;
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);
}

.mode-switch { text-align: center; margin-top: 25px; color: #64748b; font-size: 14px; }

.captcha-row {
  display: flex; gap: 12px; align-items: center;
  .captcha-img { height: 45px; border-radius: 12px; cursor: pointer; border: 1px solid #e2e8f0; }
}

.custom-steps {
  margin-bottom: 40px;
  :deep(.el-step__title) { font-size: 12px; }
}

.step-content { animation: slideUp 0.4s ease; }

.form-grid {
  display: grid; gap: 20px;
  .grid-row { display: flex; justify-content: space-between; align-items: center; span { color: #64748b; font-weight: 500; } }
}

.btn-group { display: flex; justify-content: space-between; gap: 15px; margin-top: 30px; button { flex: 1; } }

.success-view {
  text-align: center;
  .check-icon { width: 70px; height: 70px; background: #10b981; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; }
  p { color: #64748b; margin-bottom: 25px; }
}

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* 深度覆盖输入框样式 */
:deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.6) !important;
  border-radius: 18px !important;
  box-shadow: none !important;
  border: 1px solid rgba(255,255,255,0.8) !important;
  height: 50px;
  &:hover { border-color: #10b981 !important; }
}
</style>