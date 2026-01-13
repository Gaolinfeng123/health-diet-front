import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    // 1. 状态 State
    // 优先从本地缓存读取，没有则为空
    const token = ref(localStorage.getItem('token') || '')
    const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

    // 2. 动作 Actions
    // 登录成功调用：保存 Token 和用户信息
    const setLoginInfo = (user: any, newToken: string) => {
        token.value = newToken
        userInfo.value = user
        localStorage.setItem('token', newToken)
        localStorage.setItem('userInfo', JSON.stringify(user))
    }

    // 退出登录调用：清空所有数据
    const logout = () => {
        token.value = ''
        userInfo.value = {}
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
    }

    return { token, userInfo, setLoginInfo, logout }
})