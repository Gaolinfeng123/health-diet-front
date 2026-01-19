<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox } from 'element-plus'

// 引入图标 (虽然 main.ts 注册了全局，显式引入更安全)
import { Odometer, Food, User, SwitchButton, ArrowDown, CaretBottom } from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// 退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '退出',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout()
    router.push('/login')
  })
}
</script>

<template>
  <div class="app-wrapper">
    <!-- 左侧侧边栏 -->
    <div class="sidebar-container">
      <div class="logo">
        <img src="https://element-plus.org/images/element-plus-logo.svg" alt="logo" class="logo-img" v-if="false" />
        <span class="title">Health Diet</span>
      </div>

      <el-menu :default-active="route.path" background-color="#304156" text-color="#bfcbd9" active-text-color="#409EFF"
        router class="el-menu-vertical">
        <!-- 菜单 1: 仪表盘 -->
        <el-menu-item index="/dashboard">
          <el-icon>
            <Odometer />
          </el-icon>
          <span>仪表盘</span>
        </el-menu-item>

        <!-- 菜单 2: 饮食记录 -->
        <el-menu-item index="/diet">
          <el-icon>
            <Food />
          </el-icon>
          <span>饮食记录</span>
        </el-menu-item>

        <!-- 菜单 3: 个人中心 -->
        <el-menu-item index="/user">
          <el-icon>
            <User />
          </el-icon>
          <span>个人中心</span>
        </el-menu-item>

        <!-- 管理员专属菜单 -->
        <el-sub-menu index="/admin" v-if="userStore.userInfo.role === 1">
          <template #title>
            <el-icon>
              <Setting />
            </el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/admin/user">用户管理</el-menu-item>
          <!-- 新增：食物管理 -->
          <el-menu-item index="/admin/food">食物库管理</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </div>

    <!-- 右侧主体区域 -->
    <div class="main-container">
      <!-- 顶部导航栏 -->
      <div class="navbar">
        <div class="right-menu">
          <el-dropdown trigger="click">
            <div class="avatar-wrapper">
              <!-- 显示用户头像或默认头像 -->
              <el-avatar :size="30"
                :src="userStore.userInfo.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
                class="user-avatar" />
              <span class="username">{{ userStore.userInfo.nickname || userStore.userInfo.username || '用户' }}</span>
              <el-icon>
                <CaretBottom />
              </el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/user')">个人中心</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 内容展示区 (路由出口) -->
      <div class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-wrapper {
  display: flex;
  width: 100%;
  height: 100vh;
  /* 强制占满全屏高度 */
  overflow: hidden;
}

.sidebar-container {
  width: 220px;
  background-color: #304156;
  height: 100%;
  transition: width 0.28s;
  display: flex;
  flex-direction: column;
  flex-shrink: 0; // 防止被压缩

  .logo {
    height: 60px;
    line-height: 60px;
    text-align: center;
    background: #2b3a4d;
    overflow: hidden;

    .title {
      color: white;
      font-weight: 600;
      font-size: 20px;
      font-family: Avenir, Helvetica Neue, Arial, Helvetica, sans-serif;
      vertical-align: middle;
    }
  }

  .el-menu-vertical {
    border-right: none; // 去掉菜单右侧默认的白线
    width: 100%;

    /* 选中项样式 */
    :deep(.el-menu-item.is-active) {
      background-color: #263445 !important;
    }

    :deep(.el-menu-item:hover) {
      background-color: #263445 !important;
    }
  }
}

.main-container {
  flex: 1;
  /* 占据剩余空间 */
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #f0f2f5;

  .navbar {
    height: 60px;
    background: white;
    box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
    display: flex;
    justify-content: flex-end;
    /* 内容靠右 */
    align-items: center;
    padding: 0 20px;

    .avatar-wrapper {
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: 5px;

      .username {
        font-size: 14px;
        color: #333;
      }
    }
  }

  .app-main {
    flex: 1;
    /* 占据剩余高度 */
    padding: 20px;
    overflow-y: auto;
    /* 内容过多时只在内部滚动 */
    position: relative;
  }
}

/* 简单的页面切换动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>