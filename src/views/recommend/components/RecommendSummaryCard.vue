<script setup lang="ts">
import { Sunny } from '@element-plus/icons-vue'

defineProps<{
  html: string
  summaryReasons: string[]
  dailyReasons: string[]
}>()
</script>

<template>
  <article class="summary-card glass-effect">
    <div class="section-head compact">
      <div>
        <span class="section-kicker">Today Note</span>
        <h2>执行摘要</h2>
      </div>
      <el-icon><Sunny /></el-icon>
    </div>
    <div class="summary-text" v-html="html"></div>
    <div v-if="summaryReasons.length || dailyReasons.length" class="reason-block">
      <h3>推荐依据</h3>
      <ul v-if="summaryReasons.length" class="reason-list">
        <li v-for="(item, index) in summaryReasons" :key="`summary-${index}`">{{ item }}</li>
      </ul>
      <h3 v-if="dailyReasons.length">全天说明</h3>
      <ul v-if="dailyReasons.length" class="reason-list">
        <li v-for="(item, index) in dailyReasons" :key="`daily-${index}`">{{ item }}</li>
      </ul>
    </div>
  </article>
</template>

<style scoped lang="scss">
.summary-card {
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(255, 246, 238, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.08);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  color: #9a3412;
}

.section-head.compact {
  margin-bottom: 10px;
}

.section-head h2 {
  margin: 4px 0 0;
  font-size: 22px;
  color: #7c2d12;
}

.section-head > .el-icon {
  font-size: 22px;
  color: #ea580c;
}

.section-kicker {
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c2410c;
  font-weight: 800;
}

.summary-text {
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, #fff8f0 0%, #fff3e6 100%);
  border: 1px solid #ffd7b1;
  color: #7c2d12;
  font-size: 13px;
  line-height: 1.68;
}

.reason-block {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 215, 177, 0.7);
}

.reason-block h3 {
  margin: 0 0 8px;
  color: #9a3412;
  font-size: 13px;
}

.reason-list {
  margin: 0 0 8px;
  padding-left: 18px;
  color: #7c2d12;
  font-size: 12px;
  line-height: 1.6;
}
</style>
