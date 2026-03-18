<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUserInfoAPI } from '@/api/user'
import { getLocalDateString, getTodayTagText } from '@/utils/date'
import {
  Bell,
  CaretBottom,
  ChatDotRound,
  Document,
  Expand,
  Fold,
  Food,
  House,
  IceTea,
  PieChart,
  Search,
  Setting,
  Sunny,
  User
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const isCollapse = ref(false)
const NARROW_BREAKPOINT = 1280
const isNarrow = ref(typeof window !== 'undefined' && window.innerWidth <= NARROW_BREAKPOINT)
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const menuCollapsed = computed(() => isCollapse.value || isNarrow.value)

const tipsList = [
  '饭后散步 20 分钟，有助于平稳血糖。',
  '每餐先吃蔬菜再吃主食，更容易控制总量。',
  '优先选择清蒸和炖煮，减少额外油脂摄入。',
  '晚餐尽量提前 2 到 3 小时，睡眠质量会更好。'
]
const currentTipIndex = ref(0)
let tipTimer: ReturnType<typeof setInterval> | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

const rotateTips = () => {
  tipTimer = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % tipsList.length
  }, 5000)
}

const waterCount = ref(Number(localStorage.getItem('water_count')) || 0)
const lastDrinkTime = ref(localStorage.getItem('last_drink_time') || '')
const timeElapsedStr = ref('')
const nowTick = ref(Date.now())

const syncWaterDaily = () => {
  const today = getLocalDateString()
  const savedDay = localStorage.getItem('water_day') || ''
  if (savedDay !== today) {
    localStorage.setItem('water_day', today)
    waterCount.value = 0
    lastDrinkTime.value = ''
    localStorage.setItem('water_count', '0')
    localStorage.removeItem('last_drink_time')
  }
}

const updateTimeElapsed = () => {
  syncWaterDaily()
  nowTick.value = Date.now()

  if (!lastDrinkTime.value) {
    timeElapsedStr.value = '尚未饮水'
    return
  }

  const diff = Math.floor((Date.now() - new Date(lastDrinkTime.value).getTime()) / (1000 * 60))
  timeElapsedStr.value = diff < 1 ? '刚刚喝过水' : `距离上次喝水 ${diff} 分钟`
}

const addWater = () => {
  syncWaterDaily()
  waterCount.value += 1
  const now = new Date().toISOString()
  lastDrinkTime.value = now
  localStorage.setItem('water_count', String(waterCount.value))
  localStorage.setItem('last_drink_time', now)
  updateTimeElapsed()
}

const breadcrumbName = computed(() => {
  const map: Record<string, string> = {
    Dashboard: '首页',
    Diet: '饮食记录',
    Recommend: '今日推荐',
    Report: '分析报告',
    Chat: '云膳 AI',
    User: '个人中心',
    AdminUser: '用户管理',
    AdminFood: '食物管理'
  }
  return map[route.name as string] || String(route.name || '首页')
})

const searchKeyword = ref('')
const handleSearch = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  router.push({ path: '/diet', query: { keyword, _k: nonce } })
}

const todayTag = computed(() => getTodayTagText(new Date(nowTick.value)))
const displayName = computed(() => userStore.userInfo.nickname || userStore.userInfo.username || '智膳伙伴')

const syncUserInfo = async () => {
  if (!userStore.token) return

  const cached = localStorage.getItem('userInfo')
  if (!userStore.userInfo?.id && cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed?.id) {
        userStore.userInfo = parsed
        return
      }
    } catch {
      console.error('user cache parse failed')
    }
  }

  if (userStore.userInfo?.id) return

  try {
    const res = await getUserInfoAPI()
    if (res?.data) {
      userStore.userInfo = res.data
      localStorage.setItem('userInfo', JSON.stringify(res.data))
    }
  } catch {
    console.error('fetch user info failed')
  }
}

const updateNarrow = () => {
  if (typeof window !== 'undefined') {
    isNarrow.value = window.innerWidth <= NARROW_BREAKPOINT
  }
}

onMounted(() => {
  updateNarrow()
  window.addEventListener('resize', updateNarrow)
  syncUserInfo()
  syncWaterDaily()
  updateTimeElapsed()
  rotateTips()
  elapsedTimer = setInterval(updateTimeElapsed, 60000)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateNarrow)
  if (tipTimer) clearInterval(tipTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
})
</script>

<template>
  <div class="app-layout">
    <aside class="side-panel glass-effect" :class="{ 'is-collapsed': menuCollapsed }">
      <div class="side-top-nav">
        <div class="side-logo" @click="router.push('/')">
          <div class="logo-inner">ZS</div>
          <span v-show="!menuCollapsed" class="logo-text">智膳伴侣</span>
        </div>

        <el-menu
          :default-active="route.path"
          :collapse="menuCollapsed"
          :collapse-transition="false"
          router
          class="menu-list"
        >
          <el-menu-item index="/dashboard">
            <el-icon><House /></el-icon>
            <template #title>首页</template>
          </el-menu-item>
          <el-menu-item index="/diet">
            <el-icon><Food /></el-icon>
            <template #title>饮食记录</template>
          </el-menu-item>
          <el-menu-item index="/recommend">
            <el-icon><Sunny /></el-icon>
            <template #title>今日推荐</template>
          </el-menu-item>
          <el-menu-item index="/report">
            <el-icon><PieChart /></el-icon>
            <template #title>分析报告</template>
          </el-menu-item>
          <el-menu-item index="/chat">
            <el-icon><ChatDotRound /></el-icon>
            <template #title>云膳 AI</template>
          </el-menu-item>
          <el-menu-item index="/user">
            <el-icon><User /></el-icon>
            <template #title>个人中心</template>
          </el-menu-item>
          <el-sub-menu v-if="userStore.userInfo.role === 1" index="/admin">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/admin/user">用户管理</el-menu-item>
            <el-menu-item index="/admin/food">食物管理</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <div v-show="!menuCollapsed" class="side-widget-area">
        <div class="advice-bubble">
          <div class="label">
            <el-icon><Sunny /></el-icon>
            每日健康建议
          </div>
          <transition name="tip-fade" mode="out-in">
            <div :key="currentTipIndex" class="tip-content">{{ tipsList[currentTipIndex] }}</div>
          </transition>
        </div>

        <div class="illustration-container">
          <img src="@/assets/side-health.png" class="big-side-img" alt="健康插图" />
        </div>

        <div class="water-capsule">
          <div class="w-left">
            <div class="w-title">饮水追踪</div>
            <div class="w-val">
              <b>{{ waterCount }}</b>
              <small>/ 8 杯</small>
            </div>
            <div class="w-time">{{ timeElapsedStr }}</div>
          </div>
          <el-button type="primary" circle @click="addWater">
            <el-icon><IceTea /></el-icon>
          </el-button>
        </div>
      </div>
    </aside>

    <main class="main-panel">
      <header class="top-nav glass-effect">
        <div class="nav-left">
          <div class="toggle-btn" @click="isCollapse = !isCollapse">
            <el-icon :size="20"><component :is="menuCollapsed ? Expand : Fold" /></el-icon>
          </div>
          <div class="today-tag">{{ todayTag }}</div>
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item>{{ breadcrumbName }}</el-breadcrumb-item>
          </el-breadcrumb>
          <div class="search-capsule">
            <el-icon><Search /></el-icon>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索食物或饮食记录..."
              @keydown.enter.prevent="handleSearch"
            />
            <button class="search-trigger" type="button" @click="handleSearch">搜索</button>
          </div>
        </div>

        <div class="nav-right">
          <el-button class="nav-action" round @click="router.push('/diet')">去记录饮食</el-button>
          <el-button class="nav-action light" round @click="router.push('/recommend')">
            <el-icon><Sunny /></el-icon>
            今日推荐
          </el-button>
          <el-button class="nav-action light" round @click="router.push('/report')">
            <el-icon><Document /></el-icon>
            查看报告
          </el-button>
          <el-badge is-dot>
            <el-icon :size="20" style="cursor: pointer"><Bell /></el-icon>
          </el-badge>
          <el-dropdown trigger="click">
            <div class="user-capsule">
              <el-avatar :size="32" :src="userStore.userInfo.avatar || defaultAvatar" />
              <span class="user-name">{{ displayName }}</span>
              <el-icon><CaretBottom /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/user')">个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="userStore.logout(); router.push('/login')">退出系统</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <section class="content-body">
        <router-view />
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.side-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.28s ease;
  background: linear-gradient(180deg, rgba(255, 172, 122, 0.82), rgba(255, 122, 24, 0.96)) !important;
  animation: fade-up 0.45s ease;

  &.is-collapsed {
    width: 78px;

    .side-logo {
      justify-content: center;
      padding: 0;
    }

    .menu-list {
      :deep(.el-menu--collapse) {
        width: 100%;
      }

      :deep(.el-menu-item),
      :deep(.el-sub-menu__title) {
        width: calc(100% - 12px);
        margin: 6px auto;
        padding: 0 !important;
        justify-content: center;
      }

      :deep(.el-menu-item .el-icon),
      :deep(.el-sub-menu__title .el-icon) {
        margin-right: 0 !important;
      }

      :deep(.el-sub-menu__icon-arrow) {
        display: none;
      }
    }
  }

  .side-top-nav {
    flex: none;
  }

  .side-logo {
    height: 90px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0 25px;
    transition: padding 0.28s ease, justify-content 0.28s ease;

    .logo-inner {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #fff;
      background: rgba(255, 255, 255, 0.34);
    }

    .logo-text {
      font-weight: 800;
      font-size: 20px;
      color: #fff;
      white-space: nowrap;
    }
  }

  .menu-list {
    width: 100%;
    padding: 0 6px 8px;
    background: transparent !important;
    border: none !important;

    :deep(.el-menu),
    :deep(.el-menu--popup),
    :deep(.el-menu--inline) {
      background: transparent !important;
      border-right: none !important;
    }

    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
      margin: 4px 10px;
      height: 44px;
      line-height: 44px;
      border-radius: 16px;
      background: transparent !important;
      transition: background-color 0.2s ease, transform 0.2s ease;
    }

    :deep(.el-menu-item:hover),
    :deep(.el-sub-menu__title:hover) {
      background: rgba(255, 255, 255, 0.26) !important;
    }

    :deep(.el-menu-item),
    :deep(.el-sub-menu__title),
    :deep(.el-menu-item .el-icon),
    :deep(.el-sub-menu__title .el-icon) {
      color: #fff !important;
    }

    :deep(.el-menu-item.is-active) {
      color: #ff7a18 !important;
      background: rgba(255, 255, 255, 0.9) !important;
    }
  }

  .side-widget-area {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;

    .advice-bubble {
      padding: 15px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.24);

      .label {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #fff;
      }

      .tip-content {
        font-size: 13px;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.9);
      }
    }

    .illustration-container {
      flex: 1;
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      .big-side-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: drop-shadow(0 15px 15px rgba(0, 0, 0, 0.05));
      }
    }

    .water-capsule {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 30px;
      background: rgba(255, 255, 255, 0.24);

      .w-title {
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.88);
      }

      .w-val {
        b {
          font-size: 20px;
          color: #fff;
        }

        small {
          color: rgba(255, 255, 255, 0.72);
        }
      }

      .w-time {
        margin-top: 2px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.78);
      }
    }
  }
}

.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;

  .top-nav {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 25px;
    border-radius: 25px;
    animation: fade-up 0.45s ease;
  }

  .nav-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 20px;
    min-width: 0;
  }

  .toggle-btn {
    cursor: pointer;
    color: #4a5568;
  }

  .today-tag {
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: #c2410c;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .breadcrumb {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .search-capsule {
    width: 360px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px 6px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 196, 138, 0.7);
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 8px 20px rgba(255, 122, 24, 0.08);

    input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: #7c2d12;
      font-size: 13px;
    }

    input::placeholder {
      color: #9ca3af;
    }

    .search-trigger {
      border: none;
      cursor: pointer;
      white-space: nowrap;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(120deg, #ffa24f, #ff7a18);
      box-shadow: 0 8px 16px rgba(255, 122, 24, 0.24);
      transition: all 0.2s ease;
    }

    .search-trigger:hover {
      transform: translateY(-1px);
      box-shadow: 0 10px 18px rgba(255, 122, 24, 0.3);
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .nav-action {
    border: none !important;
    color: #fff !important;
    font-weight: 700;
    background: linear-gradient(120deg, #ffa24f, #ff7a18) !important;
  }

  .nav-action.light {
    color: #9a3412 !important;
    background: rgba(255, 255, 255, 0.72) !important;
  }

  .user-capsule {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    padding: 5px 12px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.02);

    .user-name {
      font-size: 13px;
      font-weight: 600;
    }
  }

  .content-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 5px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .content-body::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: all 0.5s ease;
}

.tip-fade-enter-from {
  transform: translateY(10px);
  opacity: 0;
}

.tip-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

@media (max-width: 1280px) {
  .side-panel {
    width: 86px;

    .side-widget-area {
      display: none;
    }

    .side-logo {
      justify-content: center;
      padding: 0;

      .logo-text {
        display: none;
      }
    }
  }

  .main-panel {
    .top-nav {
      padding: 0 14px;
    }

    .nav-left {
      gap: 10px;
    }

    .search-capsule {
      width: 260px;
    }
  }
}

@media (max-width: 960px) {
  .main-panel {
    padding: 10px;

    .top-nav {
      height: auto;
      min-height: 64px;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 12px;
    }

    .nav-left {
      width: 100%;
      flex-wrap: wrap;
    }

    .search-capsule {
      width: 100%;
    }

    .nav-right {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  }
}
</style>
