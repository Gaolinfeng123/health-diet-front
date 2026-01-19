import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/login/Login.vue')
        },
        {
            path: '/',
            name: 'Layout',
            // 暂时重定向到 login，等下个阶段我们写了主页再改
            redirect: '/dashboard', 
            children: [
                {
                    path: 'dashboard',
                    name: 'Dashboard',
                    // 创建一个临时的空页面，防止报错
                    component: () => import('@/views/dashboard/index.vue') 
                },
                {
                    path: 'user',
                    name: 'User',
                    component: () => import('@/views/user/index.vue')
                }
            ]
        },
    ]
})

// 路由守卫：类似后端的拦截器
router.beforeEach((to, from, next) => {
    const userStore = useUserStore()
    // 如果去的不是登录页，且没有 Token
    if (to.path !== '/login' && !userStore.token) {
        next('/login') // 强制踢回登录页
    } else {
        next() // 放行
    }
})

export default router