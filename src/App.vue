<script setup lang="ts">
// 这里不需要任何逻辑
</script>

<template>
  <!-- 根路由出口：显示 Login 或 Layout -->
  <router-view />
</template>

<style>
/* 确保全屏，防止出现奇怪的滚动条或留白 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>