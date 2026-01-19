<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { SwitchButton, User } from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-wrapper">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="logo">Health Diet</div>
      <el-menu
        active-text-color="#409EFF"
        background-color="#304156"
        text-color="#bfcbd9"
        :default-active="$route.path"
        router
        class="el-menu-vertical"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        
        <!-- 个人中心 -->
        <el-menu-item index="/user">
        <el-icon><User /></el-icon>
        <span>个人中心</span>
        </el-menu-item>
        
        <!-- 后续还会添加饮食记录、个人中心等 -->
      </el-menu>
    </div>

    <!--右侧主体-->
    <div class="main-container">
      <!-- 顶部导航 -->
      <div class="navbar">
        <div class="right-menu">
          <el-dropdown>
            <span class="el-dropdown-link">
              {{ userStore.userInfo.nickname || userStore.userInfo.username || '用户' }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="app-main">
        <!-- 这里的 router-view 就是用来显示 Dashboard 的 -->
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-wrapper {
  display: flex;
  width: 100%;
  height: 100vh;
}

.sidebar {
  width: 210px;
  background-color: #304156;
  height: 100%;
  
  .logo {
    height: 50px;
    line-height: 50px;
    text-align: center;
    color: white;
    font-weight: bold;
    font-size: 20px;
  }
  
  .el-menu-vertical {
    border-right: none;
  }
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;

  .navbar {
    height: 50px;
    background: white;
    box-shadow: 0 1px 4px rgba(0,21,41,.08);
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-right: 20px;
    
    .el-dropdown-link {
      cursor: pointer;
      display: flex;
      align-items: center;
    }
  }

  .app-main {
    padding: 20px;
    flex: 1;
    overflow-y: auto;
  }
}
</style>