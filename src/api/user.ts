import request from '@/utils/request'

// 1. 登录
export const loginAPI = (data: any) => {
    return request({
        url: '/user/login',
        method: 'post',
        data
    })
}

// 2. 注册
export const registerAPI = (data: any) => {
    return request({
        url: '/user/register',
        method: 'post',
        data
    })
}