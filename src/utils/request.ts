import axios from 'axios'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'

const request = axios.create({
    baseURL: '/api',
    timeout: 5000
})

// ==========================================
// 核心修复：全局报错防抖工具
// ==========================================
let isErrorMessageShowing = false // 锁变量

const showOneError = (msg: string) => {
    // 1. 如果锁住了，直接忽略后续报错，防止重叠
    if (isErrorMessageShowing) {
        return
    }

    // 2. 没锁，上锁并弹窗
    isErrorMessageShowing = true
    
    // 3. 强制关闭旧的弹窗 (清爽)
    ElMessage.closeAll()
    
    // 4. 显示新的
    ElMessage.error(msg)

    // 5. 500毫秒后开锁 (足够应对双重提交的时间差)
    setTimeout(() => {
        isErrorMessageShowing = false
    }, 500)
}
// ==========================================

request.interceptors.request.use(config => {
    const userStore = useUserStore()
    if (userStore.token) {
        config.headers.Authorization = userStore.token
    }
    return config
}, error => {
    return Promise.reject(error)
})

request.interceptors.response.use(
    response => {
        const res = response.data
        
        // 兼容后端习惯：code=0 或 200 都是成功
        if (res.code === 200 || res.code === 0) {
            return res
        } else {
            // 后端传过来的 res.msg 就是 "旧密码错误，请重新输入"
            const msg = res.msg || res.message || '操作失败'
            
            showOneError(msg) // <--- 使用防抖函数
            
            return Promise.reject(res)
        }
    },
    error => {
        // HTTP 状态码错误 (4xx, 5xx)
        let message = '系统未知错误'
        
        if (error.response && error.response.data) {
            const d = error.response.data
            // 这里也可能获取到 "旧密码错误..."
            message = d.msg || d.message || (typeof d === 'string' ? d : message)
        } else {
            message = error.message
        }

        if (error.response && error.response.status === 401) {
            const userStore = useUserStore()
            userStore.logout()
            location.reload()
        } else {
            if (message !== 'canceled') {
                showOneError(message) // <--- 使用防抖函数
            }
        }
        
        return Promise.reject(error)
    }
)

export default request