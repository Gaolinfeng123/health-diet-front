<script setup lang="ts">
import { DishDot } from '@element-plus/icons-vue'
import type { PfcItem } from '../useRecommend'

defineProps<{
  items: PfcItem[]
}>()
</script>

<template>
  <article class="macro-card glass-effect">
    <div class="section-head compact">
      <div>
        <span class="section-kicker">Macro Plan</span>
        <h2>宏量配比</h2>
      </div>
      <el-icon><DishDot /></el-icon>
    </div>
    <div class="macro-list">
      <div v-for="item in items" :key="item.key" class="macro-row">
        <div class="macro-head">
          <span>{{ item.label }}</span>
          <b>{{ item.amount.toFixed(1) }}g / {{ item.percent }}%</b>
        </div>
        <div class="macro-bar">
          <div class="macro-fill" :style="{ width: `${item.percent}%`, background: item.color }"></div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
.macro-card {
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

.macro-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.macro-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.macro-head span,
.macro-head b {
  font-size: 12px;
}

.macro-head span {
  color: #6b7280;
}

.macro-head b {
  color: #9a3412;
}

.macro-bar {
  height: 10px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
}

.macro-fill {
  height: 100%;
  border-radius: inherit;
}
</style>
