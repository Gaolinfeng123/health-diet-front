<script setup lang="ts">
import { ref, reactive, computed, onUnmounted, nextTick } from 'vue'
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
const countdown = ref(3)        
let timer: any = null           

// --- 验证码相关状态 (新) ---
const captchaBase64 = ref('')   // 图片 Base64
const captchaKey = ref('')      // 后端返回的 uuid key
const loginNeedCaptcha = ref(false) // 登录是否触发熔断机制

// --- 表单数据 ---
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  gender: 1, 
  age: 25,
  height: 175,
  weight: 70,
  target: 0,
  captchaCode: '' // 验证码输入值
})

// --- 辅助显示 ---
const genderLabel = computed(() => form.gender === 1 ? '男' : '女')
const targetLabel = computed(() => {
  const map: Record<number, string> = { '-1': '减脂', '0': '维持', '1': '增肌' }
  return map[form.target]
})

// --- 核心逻辑 ---

// 1. 获取验证码
const refreshCaptcha = async () => {
  try {
    const res = await getCaptchaAPI()
    // 假设后端返回结构: { key: "uuid...", image: "data:image/png;base64,..." }
    // 如果后端直接返回 data: { key, image }
    const data = res.data 
    captchaKey.value = data.key
    captchaBase64.value = data.image
    form.captchaCode = '' // 清空输入框
  } catch (e) {
    console.error('获取验证码失败', e)
  }
}

// 2. 切换模式
const toggleMode = () => {
  isLogin.value = !isLogin.value
  activeStep.value = 0
  clearInterval(timer)
  loginNeedCaptcha.value = false // 重置登录验证码状态
  form.captchaCode = ''
  
  // 如果切到注册模式，虽然第一步不用验证码，但可以先预加载一下，或者等最后一步再加载
  // 这里我们选择：注册的最后一步加载验证码
}

// 3. 登录提交 (含熔断机制)
const handleLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  // 如果触发了风控，必须校验验证码
  if (loginNeedCaptcha.value && !form.captchaCode) {
    ElMessage.warning('请输入验证码')
    return
  }

  try {
    const loginData = {
      username: form.username,
      password: form.password,
      // 只有触发熔断才传这两个字段
      ...(loginNeedCaptcha.value ? { 
          captchaKey: captchaKey.value, 
          captchaCode: form.captchaCode 
      } : {})
    }

    const res = await loginAPI(loginData)
    
    // 登录成功
    userStore.setLoginInfo({ username: form.username }, res.data)
    ElMessage.success('登录成功')
    router.push('/')
    
  } catch (error: any) {
    // --- 核心：处理后端返回的业务熔断 ---
    // 假设 request.ts 把非200的响应 reject 出来了，且 error 就是后端返回的完整对象
    // 检查 res.data.needCaptcha (根据文档)
    const resData = error.data || {}
    
    if (resData.needCaptcha) {
      ElMessage.warning('系统检测到风险，请验证身份')
      loginNeedCaptcha.value = true
      await refreshCaptcha() // 立即拉取验证码
    } else {
      // 普通报错（如密码错误），如果有验证码也刷新一下
      if (loginNeedCaptcha.value) refreshCaptcha()
    }
  }
}

// 4. 注册步骤控制
const nextStep = () => {
  if (activeStep.value === 0) {
    if (!form.username || !form.password) return ElMessage.warning('请填写完整账号信息')
    if (form.password.length < 6) return ElMessage.warning('密码至少6位')
    if (form.password !== form.confirmPassword) return ElMessage.warning('两次密码不一致')
  }
  if (activeStep.value === 1) {
    if (!form.age) return ElMessage.warning('请填写年龄')
  }
  
  activeStep.value++
  
  // 如果进入了第2步（身体数据+验证码），这时候去拉取验证码最合适，保证新鲜
  if (activeStep.value === 2) {
    refreshCaptcha()
  }
}

const prevStep = () => {
  if (activeStep.value > 0) activeStep.value--
}

// 5. 注册提交
const handleRegisterSubmit = async () => {
  if (!form.captchaCode) return ElMessage.warning('请输入验证码')

  try {
    const registerData = {
      username: form.username,
      password: form.password,
      gender: form.gender,
      age: form.age,
      height: form.height,
      weight: form.weight,
      target: form.target,
      // 必传验证码
      captchaKey: captchaKey.value,
      captchaCode: form.captchaCode
    }
    
    await registerAPI(registerData)
    
    activeStep.value = 3
    startCountdown()
    
  } catch (error: any) {
    // 验证码错误或用户名重复，都刷新验证码
    refreshCaptcha()
    
    if (error.response?.data?.msg?.includes('用户') || error.response?.data?.msg?.includes('存在')) {
       setTimeout(() => activeStep.value = 0, 1500)
    }
  }
}

const startCountdown = () => {
  countdown.value = 3
  timer = setInterval(async () => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      await handleLogin() // 注册完自动登录通常不会触发验证码，除非IP极高危
    }
  }, 1000)
}

const cancelAutoLogin = () => {
  clearInterval(timer)
  // 返回到确认页，并刷新验证码
  activeStep.value = 2 
  refreshCaptcha()
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="login-container">
    <div class="login-box" :class="{ 'register-mode': !isLogin }">
      
      <div class="login-left">
        <h2>Health Diet</h2>
        <p>您的个人健康饮食管家</p>
      </div>

      <div class="login-right">
        
        <!-- 登录模式 -->
        <div v-if="isLogin" class="login-form fade-in">
          <h3>欢迎回来</h3>
          <el-form size="large">
            <el-form-item>
              <el-input v-model="form.username" placeholder="账号" :prefix-icon="User" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="form.password" type="password" placeholder="密码" :prefix-icon="Lock" show-password @keyup.enter="handleLogin"/>
            </el-form-item>
            
            <!-- 熔断机制：验证码行 -->
            <el-form-item v-if="loginNeedCaptcha" class="captcha-row">
              <div class="captcha-container">
                <el-input v-model="form.captchaCode" placeholder="验证码" :prefix-icon="Picture" style="flex: 1" @keyup.enter="handleLogin"/>
                <img :src="captchaBase64" @click="refreshCaptcha" class="captcha-img" alt="验证码" title="点击刷新"/>
              </div>
            </el-form-item>

            <el-button type="primary" class="full-btn" @click="handleLogin">登 录</el-button>
          </el-form>
        </div>

        <!-- 注册模式 -->
        <div v-else class="register-form fade-in">
          <h3>创建新账号</h3>
          
          <el-steps :active="activeStep" finish-status="success" align-center class="mb-20">
            <el-step title="账号" />
            <el-step title="基础" />
            <el-step title="确认" />
          </el-steps>

          <!-- 步骤 0: 账号密码 -->
          <div v-if="activeStep === 0" class="step-content">
            <el-form size="large">
              <el-form-item>
                <el-input v-model="form.username" placeholder="设置账号" :prefix-icon="User" />
              </el-form-item>
              <el-form-item>
                <el-input v-model="form.password" type="password" placeholder="设置密码 (6位以上)" :prefix-icon="Lock" show-password />
              </el-form-item>
              <el-form-item>
                <el-input v-model="form.confirmPassword" type="password" placeholder="确认密码" :prefix-icon="Lock" />
              </el-form-item>
              <el-button type="primary" class="full-btn" @click="nextStep">下一步 <el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
            </el-form>
          </div>

          <!-- 步骤 1: 性别年龄 -->
          <div v-if="activeStep === 1" class="step-content">
             <div class="form-row">
               <span class="label">性别</span>
               <el-radio-group v-model="form.gender">
                  <el-radio-button :label="1">男士</el-radio-button>
                  <el-radio-button :label="0">女士</el-radio-button>
               </el-radio-group>
             </div>
             <div class="form-row mt-20">
               <span class="label">年龄</span>
               <el-input-number v-model="form.age" :min="10" :max="100" />
             </div>
             <div class="btn-group mt-30">
               <el-button @click="prevStep" :icon="ArrowLeft">上一步</el-button>
               <el-button type="primary" @click="nextStep">下一步 <el-icon class="el-icon--right"><ArrowRight /></el-icon></el-button>
             </div>
          </div>

          <!-- 步骤 2: 身体数据 + 验证码 -->
          <div v-if="activeStep === 2" class="step-content">
            <div class="form-row">
               <span class="label">身高 (cm)</span>
               <el-slider v-model="form.height" :min="100" :max="230" show-input input-size="small" />
             </div>
             <div class="form-row mt-10">
               <span class="label">体重 (kg)</span>
               <el-slider v-model="form.weight" :min="30" :max="150" show-input input-size="small" />
             </div>
             <div class="form-row mt-10">
               <span class="label">目标</span>
               <el-select v-model="form.target" placeholder="选择目标">
                <el-option label="减脂" :value="-1" />
                <el-option label="维持" :value="0" />
                <el-option label="增肌" :value="1" />
              </el-select>
             </div>

             <!-- 注册强制验证码 -->
             <div class="captcha-container mt-20">
                <el-input v-model="form.captchaCode" placeholder="请输入右侧验证码" :prefix-icon="Picture" />
                <img :src="captchaBase64" @click="refreshCaptcha" class="captcha-img" alt="验证码" />
             </div>

             <div class="btn-group mt-20">
               <el-button @click="prevStep" :icon="ArrowLeft">上一步</el-button>
               <el-button type="success" @click="handleRegisterSubmit" :icon="Check">确认注册</el-button>
             </div>
          </div>

          <!-- 步骤 3: 成功 -->
          <div v-if="activeStep === 3" class="success-content">
            <div class="success-icon"><el-icon><Check /></el-icon></div>
            <h4>注册成功！</h4>
            <div class="summary-card">
              <p><strong>账号：</strong>{{ form.username }}</p>
              <p><strong>目标：</strong>{{ targetLabel }}</p>
            </div>
            <p class="countdown-text">{{ countdown }} 秒后自动登录...</p>
            <div class="btn-group">
              <el-button type="info" plain @click="cancelAutoLogin" :icon="Close">取消</el-button>
              <el-button type="primary" @click="handleLogin">立即进入</el-button>
            </div>
          </div>

        </div>

        <div class="links" v-if="activeStep !== 3">
          <el-link type="primary" @click="toggleMode">
            {{ isLogin ? '没有账号？去注册' : '已有账号？去登录' }}
          </el-link>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-box {
  width: 800px;
  height: 450px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  overflow: hidden;
  transition: height 0.4s ease;

  &.register-mode {
    height: 580px; /* 稍微再高一点容纳验证码 */
  }

  .login-left {
    width: 35%;
    background: #409EFF;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    h2 { font-size: 28px; margin-bottom: 10px; }
    p { opacity: 0.8; }
  }

  .login-right {
    width: 65%;
    padding: 30px 50px;
    display: flex;
    flex-direction: column;
    justify-content: center;

    h3 {
      font-size: 22px;
      margin-bottom: 25px;
      text-align: center;
      color: #333;
    }

    .full-btn { width: 100%; }
    .mb-20 { margin-bottom: 20px; }
    .mt-10 { margin-top: 10px; }
    .mt-20 { margin-top: 20px; }
    .mt-30 { margin-top: 30px; }

    .step-content { animation: slideIn 0.3s ease-out; }

    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      .label { font-weight: bold; color: #555; width: 80px; }
      :deep(.el-slider) { flex: 1; margin-left: 10px; }
    }

    // 验证码样式
    .captcha-container {
      display: flex;
      gap: 10px;
      align-items: center;
      .captcha-img {
        height: 40px;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        cursor: pointer;
        &:hover { opacity: 0.8; }
      }
    }

    .btn-group { display: flex; justify-content: space-between; }

    .success-content {
      text-align: center;
      animation: fadeIn 0.5s;
      .success-icon {
        width: 60px; height: 60px;
        background: #67C23A;
        border-radius: 50%;
        color: white;
        font-size: 30px;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 10px;
      }
      .summary-card {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        text-align: left;
        margin: 15px 0;
      }
      .countdown-text { color: #E6A23C; font-weight: bold; margin-bottom: 20px; }
    }

    .links {
      margin-top: auto;
      padding-top: 20px;
      text-align: right;
      border-top: 1px solid #eee;
    }
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>