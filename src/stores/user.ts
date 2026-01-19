import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
    // 1. 状态 State
    const token = ref(localStorage.getItem('token') || '')
    const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))

    // 2. 动作 Actions
    const setLoginInfo = (user: any, newToken: string) => {
        token.value = newToken
        userInfo.value = user
        localStorage.setItem('token', newToken)
        localStorage.setItem('userInfo', JSON.stringify(user))
    }

    const logout = () => {
        token.value = ''
        userInfo.value = {}
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
    }

    return { token, userInfo, setLoginInfo, logout }
})