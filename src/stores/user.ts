import request from '@/utils/request'

// --- 1. 获取验证码 (新增) ---
export const getCaptchaAPI = () => {
    return request({
        url: '/auth/captcha',
        method: 'get'
    })
}

// --- 2. 登录 (支持验证码参数) ---
// DTO: username, password, captchaKey?, captchaCode?
export const loginAPI = (data: any) => {
    return request({
        url: '/user/login',
        method: 'post',
        data
    })
}

// --- 3. 注册 (必须带验证码) ---
// DTO: RegisterDTO 包含 captchaKey, captchaCode
export const registerAPI = (data: any) => {
    return request({
        url: '/user/register',
        method: 'post',
        data
    })
}