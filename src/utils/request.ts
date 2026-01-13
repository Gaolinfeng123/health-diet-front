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

// 2. 响应拦截器：收到结果后做的事
request.interceptors.response.use(response => {
    const res = response.data
    
    // 假设后端返回结构是 { code: 200, data: ..., message: ... }
    // 如果 code 是 200，说明业务成功
    if (res.code === 200 || res.code === 0) { // 兼容部分后端习惯用 0
        return res
    } else {
        // 业务失败（如密码错误），弹出错误提示
        ElMessage.error(res.message || '系统异常')
        return Promise.reject(res)
    }
}, error => {
    // HTTP 状态码错误处理
    if (error.response && error.response.status === 401) {
        // 401 说明 Token 过期或未登录
        const userStore = useUserStore()
        userStore.logout()
        location.reload() // 刷新页面，会被路由守卫踢回登录页
    } else {
        ElMessage.error(error.message || '网络错误')
    }
    return Promise.reject(error)
})

export default request