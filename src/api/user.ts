import request from '@/utils/request'

// 1. 获取验证码
export const getCaptchaAPI = () => {
    return request({
        url: '/auth/captcha',
        method: 'get'
    })
}

// 2. 登录
export const loginAPI = (data: any) => {
    return request({
        url: '/user/login',
        method: 'post',
        data
    })
}

// 3. 注册
export const registerAPI = (data: any) => {
    return request({
        url: '/user/register',
        method: 'post',
        data
    })
}

// 4. 获取个人信息 (新增)
export const getUserInfoAPI = () => {
    return request({
        url: '/user/info',
        method: 'get'
    })
}

// 5. 修改个人资料
export const updateUserInfoAPI = (data: any) => {
    return request({
        url: '/user/update',
        method: 'post',
        data
    })
}

// 6. 修改密码
export const updatePasswordAPI = (data: any) => {
    return request({
        url: '/user/updatePassword',
        method: 'post',
        data
    })
}