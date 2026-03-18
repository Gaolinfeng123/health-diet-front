<script setup lang="ts">
import { Opportunity } from '@element-plus/icons-vue'

defineProps<{
  tips: string[]
}>()
</script>

<template>
  <article class="tips-card glass-effect">
    <div class="section-head compact">
      <div>
        <span class="section-kicker">Action List</span>
        <h2>附加建议</h2>
      </div>
      <el-icon><Opportunity /></el-icon>
    </div>
    <ul class="suggestion-list">
      <li v-for="(tip, idx) in tips" :key="idx">
        <span class="suggestion-num">{{ idx + 1 }}</span>
        <span class="suggestion-txt">{{ tip }}</span>
      </li>
    </ul>
  </article>
</template>

<style scoped lang="scss">
.tips-card {
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

.suggestion-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.suggestion-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  border: 1px solid rgba(255, 214, 177, 0.5);
  color: #4a5568;
  font-size: 12px;
  line-height: 1.55;
}

.suggestion-list li:last-child {
  margin-bottom: 0;
}

.suggestion-num {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
  background: linear-gradient(135deg, #ffb676, #ff7a18);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  border-radius: 50%;
}

.suggestion-txt {
  flex: 1;
  min-width: 0;
}
</style>
