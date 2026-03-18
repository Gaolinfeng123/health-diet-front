<script setup lang="ts">
import { ForkSpoon } from '@element-plus/icons-vue'
import type { MealCard } from '../useRecommend'

const props = defineProps<{
  meals: MealCard[]
  toNumber: (value: unknown) => number
}>()

const getLockLabel = (meal: MealCard) => {
  if (meal.type === 'snack') return '已记录加餐'
  return '已锁定'
}
</script>

<template>
  <section class="meal-board glass-effect">
    <div class="section-head">
      <div>
        <span class="section-kicker">Meal Plan</span>
        <h2>今日食谱轨迹</h2>
      </div>
      <el-icon><ForkSpoon /></el-icon>
    </div>

    <div v-if="props.meals.length" class="meal-grid">
      <div
        v-for="meal in props.meals"
        :key="meal.type"
        class="meal-card"
        :style="{ '--meal-accent': meal.meta.accent }"
      >
        <div class="meal-topline">
          <span class="meal-chip">{{ meal.meta.chip }}</span>
          <div class="meal-topline-right">
            <span v-if="meal.locked" class="meal-lock">{{ getLockLabel(meal) }}</span>
            <span class="meal-calories">{{ Math.round(props.toNumber(meal.calories)) }} kcal</span>
          </div>
        </div>

        <div class="meal-title-row">
          <strong>{{ meal.title }}</strong>
          <small>{{ meal.meta.label }}</small>
        </div>

        <div class="meal-menu">{{ meal.menu }}</div>

        <div class="meal-macros">
          <span>P {{ props.toNumber(meal.macros?.protein).toFixed(1) }}g</span>
          <span>F {{ props.toNumber(meal.macros?.fat).toFixed(1) }}g</span>
          <span>C {{ props.toNumber(meal.macros?.carbs).toFixed(1) }}g</span>
        </div>

        <p class="meal-advice">{{ meal.advice }}</p>

        <ul v-if="meal.reasons?.length" class="meal-reasons">
          <li v-for="(item, index) in meal.reasons" :key="`${meal.type}-${index}`">{{ item }}</li>
        </ul>
      </div>
    </div>

    <el-empty v-else description="暂无食谱轨迹" :image-size="80" />
  </section>
</template>

<style scoped lang="scss">
.meal-board {
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

.meal-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.meal-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.94);
  box-shadow: inset 4px 0 0 var(--meal-accent);
}

.meal-topline,
.meal-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.meal-topline-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meal-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: #fff6ee;
  color: #92400e;
  border: 1px solid rgba(255, 215, 177, 0.85);
  font-size: 12px;
  font-weight: 700;
}

.meal-calories {
  color: #ea580c;
  font-weight: 800;
  font-size: 13px;
}

.meal-lock {
  padding: 4px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 700;
}

.meal-title-row strong {
  color: #7c2d12;
  font-size: 20px;
}

.meal-title-row small {
  color: #9ca3af;
  font-size: 12px;
}

.meal-menu {
  min-height: 42px;
  color: #1f2937;
  line-height: 1.55;
  font-size: 13px;
}

.meal-macros {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meal-macros span {
  padding: 6px 10px;
  border-radius: 999px;
  background: #fff6ee;
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.meal-advice {
  margin: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(249, 115, 22, 0.08);
  color: #7c2d12;
  font-size: 12px;
  line-height: 1.55;
}

.meal-reasons {
  margin: 0;
  padding-left: 18px;
  color: #7c2d12;
  font-size: 12px;
  line-height: 1.55;
}

@media (max-width: 1200px) {
  .meal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
