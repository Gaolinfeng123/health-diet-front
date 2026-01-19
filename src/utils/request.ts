import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const request = axios.create({
    baseURL: '/api', // 配合 vite.config.ts 的代理配置
    timeout: 5000    // 请求超时时间 5秒
})

// 1. 请求拦截器：发送请求前做的事
request.interceptors.request.use(config => {
    const userStore = useUserStore()
    // 如果有 Token，就加到 Header 里
    if (userStore.token) {
        config.headers.Authorization = userStore.token
    }
    return config
}, error => {
    return Promise.reject(error)
})

// 响应拦截器
request.interceptors.response.use(response => {
    // ... 成功处理逻辑不变
    const res = response.data
    if (res.code === 200 || res.code === 0) {
        return res
    } else {
        ElMessage.error(res.message || '系统异常')
        return Promise.reject(res)
    }
}, error => {
    // --- 重点修改这里 ---
    let message = '系统未知错误'
    
    // 如果后端返回了响应体 (例如 500 错误)
    if (error.response && error.response.data) {
        const errData = error.response.data
        // 优先取后端返回的 msg
        message = errData.msg || errData.message || message
    } else {
        message = error.message
    }

    // 排除 401 (未登录) 的情况，避免重复报错
    if (error.response && error.response.status === 401) {
        const userStore = useUserStore()
        userStore.logout()
        location.reload()
    } else {
        ElMessage.error(message) // 这里就会显示 "用户名已存在"
    }
    
    return Promise.reject(error)
})

export default request