<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { 
  House, Food, User, CaretBottom, Setting, 
  Fold, Expand, Bell, Search, IceTea, SwitchButton, PieChart, Sunny
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()
const isCollapse = ref(false)

const tipsList = ["餐后30分钟散步可平抑血糖波动。🏃", "早起一杯温开水，唤醒肠胃动力。💧", "多吃绿叶蔬菜，补充天然膳食纤维。🥗", "少吃加工食品，多吃天然原粮。🌾"]
const currentTipIndex = ref(0)
let tipTimer: any = null
const rotateTips = () => { tipTimer = setInterval(() => { currentTipIndex.value = (currentTipIndex.value + 1) % tipsList.length }, 5000) }

const waterCount = ref(Number(localStorage.getItem('water_count')) || 0)
const lastDrinkTime = ref(localStorage.getItem('last_drink_time') || '')
const timeElapsedStr = ref('')

const updateTimeElapsed = () => {
  if (!lastDrinkTime.value) { timeElapsedStr.value = '尚未饮水'; return }
  const diff = Math.floor((new Date().getTime() - new Date(lastDrinkTime.value).getTime()) / (1000 * 60))
  timeElapsedStr.value = diff < 1 ? '刚刚喝过水' : `距上次喝水 ${diff} 分钟`
}

const addWater = () => {
  waterCount.value++; const now = new Date().toISOString()
  lastDrinkTime.value = now; localStorage.setItem('water_count', waterCount.value.toString())
  localStorage.setItem('last_drink_time', now); updateTimeElapsed()
}

const breadcrumbName = computed(() => {
  const map: Record<string, string> = { 'Dashboard': '首页', 'Diet': '饮食记录', 'User': '个人中心', 'Report': '分析报告', 'AdminUser': '用户管理', 'AdminFood': '食物库管理' }
  return map[route.name as string] || route.name
})

const searchKeyword = ref('')
const handleSearch = () => {
  if (!searchKeyword.value) return
  router.push({ path: '/diet', query: { keyword: searchKeyword.value } })
}

onMounted(() => { updateTimeElapsed(); rotateTips(); setInterval(updateTimeElapsed, 60000) })
onUnmounted(() => { clearInterval(tipTimer) })
</script>

<template>
  <div class="app-layout">
    <!-- 侧边栏：磨砂质感 -->
    <aside class="side-panel glass-effect" :class="{ 'is-collapsed': isCollapse }">
      <div class="side-top-nav">
        <div class="side-logo" @click="router.push('/')">
          <div class="logo-inner">HD</div>
          <span class="logo-text" v-show="!isCollapse">Health Diet</span>
        </div>
        
        <el-menu :default-active="route.path" :collapse="isCollapse" router class="menu-list">
          <el-menu-item index="/dashboard"><el-icon><House /></el-icon><template #title>首页</template></el-menu-item>
          <el-menu-item index="/diet"><el-icon><Food /></el-icon><template #title>饮食记录</template></el-menu-item>
          <el-menu-item index="/report"><el-icon><PieChart /></el-icon><template #title>分析报告</template></el-menu-item>
          <el-menu-item index="/user"><el-icon><User /></el-icon><template #title>个人中心</template></el-menu-item>
          <el-sub-menu index="/admin" v-if="userStore.userInfo.role === 1">
            <template #title><el-icon><Setting /></el-icon><span>系统管理</span></template>
            <el-menu-item index="/admin/user">用户管理</el-menu-item>
            <el-menu-item index="/admin/food">食物管理</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 侧边栏下半部分：图片与工具 -->
      <div class="side-widget-area" v-show="!isCollapse">
        <!-- 每日建议 -->
        <div class="advice-bubble">
          <div class="label"><el-icon><Sunny /></el-icon> 每日健康建议</div>
          <transition name="tip-fade" mode="out-in">
            <div :key="currentTipIndex" class="tip-content">{{ tipsList[currentTipIndex] }}</div>
          </transition>
        </div>

        <!-- 🎨 图片：设为 flex: 1 强制撑开占据空间 -->
        <div class="illustration-container">
          <img src="@/assets/side-health.png" class="big-side-img" />
        </div>

        <!-- 饮水打卡 -->
        <div class="water-capsule">
           <div class="w-left">
             <div class="w-title">饮水追踪</div>
             <div class="w-val"><b>{{ waterCount }}</b> <small>/ 8杯</small></div>
           </div>
           <el-button type="primary" circle @click="addWater"><el-icon><IceTea /></el-icon></el-button>
        </div>
      </div>
    </aside>

    <main class="main-panel">
      <!-- 顶部导航：[折叠] [面包屑] [搜索] -->
      <header class="top-nav glass-effect">
        <div class="nav-left">
          <div class="toggle-btn" @click="isCollapse = !isCollapse"><el-icon :size="20"><component :is="isCollapse ? Expand : Fold" /></el-icon></div>
          <el-breadcrumb separator="/" class="breadcrumb"><el-breadcrumb-item>{{ breadcrumbName }}</el-breadcrumb-item></el-breadcrumb>
          <div class="search-capsule">
            <el-icon><Search /></el-icon>
            <input v-model="searchKeyword" type="text" placeholder="探索健康饮食..." @keyup.enter="handleSearch" />
          </div>
        </div>

        <div class="nav-right">
          <el-badge is-dot><el-icon :size="20" style="cursor:pointer"><Bell /></el-icon></el-badge>
          <el-dropdown trigger="click">
            <div class="user-capsule">
              <el-avatar :size="32" :src="userStore.userInfo.avatar" />
              <span class="user-name">{{ userStore.userInfo.nickname || '管理员' }}</span>
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

      <section class="content-body"><router-view /></section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.app-layout { display: flex; width: 100vw; height: 100vh; overflow: hidden; }

/* 侧边栏玻璃感增强 */
.side-panel {
  width: 280px; display: flex; flex-direction: column; transition: width 0.3s;
  background: rgba(255, 255, 255, 0.1) !important;
  &.is-collapsed { width: 70px; }

  .side-top-nav { flex: none; }
  .side-logo { height: 90px; display: flex; align-items: center; padding: 0 25px; gap: 12px; .logo-inner { width: 34px; height: 34px; background: #10b981; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; } .logo-text { font-weight: 800; font-size: 20px; color: #10b981; } }

  /* 使用 :deep 穿透组件限制，强制清除菜单背景 */
.menu-list {
  background: transparent !important;
  border: none !important;

  /* 清除子菜单容器的背景（这是最关键的一行） */
  :deep(.el-menu--inline) {
    background-color: transparent !important;
  }

  /* 清除菜单项及其标题的背景 */
  :deep(.el-menu-item), :deep(.el-sub-menu__title) {
    background-color: transparent !important;
  }

  /* 只有鼠标悬停时才显示淡色背景 */
  :deep(.el-menu-item:hover), :deep(.el-sub-menu__title:hover) {
    background-color: rgba(16, 185, 129, 0.1) !important;
  }
}

  /* 核心：侧边栏小工具布局 */
  .side-widget-area {
    flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 15px; min-height: 0;
    
    .advice-bubble {
      background: rgba(255,255,255,0.4); padding: 15px; border-radius: 24px;
      .label { font-size: 12px; font-weight: bold; color: #059669; display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
      .tip-content { font-size: 13px; color: #374151; line-height: 1.5; }
    }

    .illustration-container {
      flex: 1; display: flex; align-items: center; justify-content: center;
      min-height: 0; /* 允许 flex 压缩 */
      .big-side-img { 
        width: 100%; height: 100%; 
        object-fit: contain; /* 保证图片在不溢出的前提下尽可能大 */
        filter: drop-shadow(0 15px 15px rgba(0,0,0,0.05));
      }
    }

    .water-capsule {
      background: rgba(255,255,255,0.5); padding: 12px 20px; border-radius: 30px;
      display: flex; justify-content: space-between; align-items: center;
      .w-title { font-size: 12px; color: #64748b; font-weight: 600; }
      .w-val { b { font-size: 20px; color: #3b82f6; } small { color: #94a3b8; } }
    }
  }
}

.main-panel {
  flex: 1; display: flex; flex-direction: column; padding: 15px; gap: 15px;
  .top-nav {
    height: 64px; border-radius: 25px; padding: 0 25px; display: flex; justify-content: space-between; align-items: center;
    .nav-left { 
      display: flex; align-items: center; gap: 20px; flex: 1;
      .toggle-btn { cursor: pointer; color: #4a5568; }
      .breadcrumb { font-weight: 600; font-size: 14px; }
      .search-capsule {
        background: rgba(0,0,0,0.04); border-radius: 20px; padding: 8px 18px;
        display: flex; align-items: center; gap: 10px; width: 260px;
        input { background: transparent; border: none; outline: none; width: 100%; font-size: 13px; }
      }
    }
    .nav-right { display: flex; align-items: center; gap: 20px; .user-capsule { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 5px 12px; background: rgba(255,255,255,0.6); border-radius: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.02); .user-name { font-size: 13px; font-weight: 600; } } }
  }
  .content-body { flex: 1; overflow-y: auto; padding: 5px; }
}

.tip-fade-enter-active, .tip-fade-leave-active { transition: all 0.5s ease; }
.tip-fade-enter-from { transform: translateY(10px); opacity: 0; }
.tip-fade-leave-to { transform: translateY(-10px); opacity: 0; }
</style>