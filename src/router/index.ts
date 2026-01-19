import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

/* 
  关键点：
  Layout 是父级路由，它包含了侧边栏和顶部导航。
  Dashboard、Diet、User 是子路由，它们会显示在 Layout 的 <router-view> 里面。
*/

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/login/Login.vue')
        },
        {
            // 父级路由：路径是 /
            path: '/',
            name: 'Layout',
            component: () => import('@/layout/index.vue'), // 这里加载侧边栏布局
            redirect: '/dashboard', // 默认跳到仪表盘
            // 子路由：所有有侧边栏的页面都写在这里
            children: [
                {
                    path: 'dashboard',
                    name: 'Dashboard',
                    component: () => import('@/views/dashboard/index.vue')
                },
                {
                    path: 'diet',
                    name: 'Diet',
                    component: () => import('@/views/diet/index.vue')
                },
                {
                    path: 'user',
                    name: 'User',
                    component: () => import('@/views/user/index.vue')
                },
                {
                    path: 'admin/user',
                    name: 'AdminUser',
                    component: () => import('@/views/admin/user/index.vue')
     } 
            ]
        }
    ]
})

// 路由守卫 (保持不变)
router.beforeEach((to, from, next) => {
    const userStore = useUserStore()
    if (to.path !== '/login' && !userStore.token) {
        next('/login')
    } else {
        next()
    }
})

export default router