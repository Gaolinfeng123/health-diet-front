<script setup lang="ts">
import { computed } from 'vue'
import { Apple, Calendar } from '@element-plus/icons-vue'
import type { BodyStatusMeta } from '@/utils/health'

const props = defineProps<{
  reportDateLabel: string
  goalLabel: string
  bodyStatus: BodyStatusMeta
  keyMessage: string
  dailySummaryText: string
  bmi: number
  caloriesTarget: number
  activityFactor: number
  tdee: number
  totalCalories: number
  mealCount: number
  refreshing: boolean
  refreshMessage: string
  isRefreshed: boolean
  lockedMeals: string[]
  summaryReasons: string[]
}>()

defineEmits<{
  refresh: []
}>()

const calorieDelta = computed(() => props.totalCalories - props.caloriesTarget)

const calorieDeltaLabel = computed(() => {
  const diff = calorieDelta.value
  if (Math.abs(diff) <= 80) return '基本贴近轨迹总热量'
  if (diff > 0) return `高于轨迹总热量 ${diff} kcal`
  return `低于轨迹总热量 ${Math.abs(diff)} kcal`
})

const executionStatus = computed(() => {
  const diff = Math.abs(calorieDelta.value)
  if (diff <= 80) return { text: '执行稳定', tone: 'good' }
  if (diff <= 220) return { text: '轻微偏移', tone: 'warm' }
  return { text: '需要关注', tone: 'warn' }
})

const reasonList = computed(() => props.summaryReasons.map((item) => item?.trim()).filter(Boolean))

const findReason = (patterns: string[]) => {
  return reasonList.value.find((item) => patterns.some((pattern) => item.includes(pattern))) || ''
}

const executionFocus = computed(() => {
  const raw = (props.dailySummaryText || props.keyMessage || '').trim()
  if (!raw) return '按今日推荐节奏执行三餐，优先保证整体稳定。'
  return raw.replace(/^执行重点[：:]\s*/, '')
})

const recentAdjustment = computed(() => {
  return (
    findReason(['近 7 天', '近7天', '热量修正', '额外热量修正']) ||
    '近期摄入较稳定，未触发额外热量修正。'
  )
})

const goalImpact = computed(() => {
  const reason = [...reasonList.value].reverse().find((item) => item.includes('模式'))
  return reason || `${props.goalLabel} 模式下，建议按当前推荐节奏执行。`
})

const macroDirection = computed(() => {
  return (
    findReason(['蛋白质']) ||
    findReason(['碳水']) ||
    findReason(['脂肪']) ||
    '当前没有额外的宏量营养修正提示。'
  )
})

const activityFactorText = computed(() => {
  if (!Number.isFinite(props.activityFactor) || props.activityFactor <= 0) return '--'
  return props.activityFactor.toFixed(2)
})

const tdeeText = computed(() => {
  if (!Number.isFinite(props.tdee) || props.tdee <= 0) return '--'
  return String(Math.round(props.tdee))
})

const lockedText = computed(() => {
  if (!props.lockedMeals.length) return '未锁定'
  return `${props.lockedMeals.length} 餐已锁定`
})
</script>

<template>
  <section class="hero-shell glass-effect">
    <div class="hero-main">
      <div class="hero-header">
        <div class="hero-copy">
          <div class="hero-kicker">
            <span class="date-pill"><el-icon><Calendar /></el-icon> {{ reportDateLabel }}</span>
            <span class="goal-pill">{{ goalLabel }}</span>
          </div>

          <h1>今日饮食计划</h1>
          <p>{{ keyMessage }}</p>
        </div>

        <div class="hero-tags">
          <span class="hero-chip"><el-icon><Apple /></el-icon> BMI {{ bmi.toFixed(1) }}</span>
          <span class="hero-chip" :class="bodyStatus.level">{{ bodyStatus.text }}</span>
          <span class="hero-chip warm">目标热量 {{ caloriesTarget }} kcal</span>
          <span v-if="isRefreshed" class="hero-chip refresh">已刷新</span>
          <span v-for="meal in lockedMeals" :key="meal" class="hero-chip lock">{{ meal }} 已锁定</span>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <span>热量差值</span>
          <strong :class="calorieDelta > 0 ? 'warn' : calorieDelta < 0 ? 'cool' : 'good'">
            {{ calorieDelta > 0 ? '+' : '' }}{{ calorieDelta }}
          </strong>
          <small>{{ calorieDeltaLabel }}</small>
        </div>

        <div class="stat-card">
          <span>执行状态</span>
          <strong :class="executionStatus.tone">{{ executionStatus.text }}</strong>
          <small>按总热量与轨迹总热量对比得出</small>
        </div>

        <div class="stat-card">
          <span>计划密度</span>
          <strong>{{ mealCount }} 餐</strong>
          <small>{{ lockedText }}</small>
        </div>
      </div>

      <div class="basis-grid">
        <div class="basis-card metric">
          <span>活动系数</span>
          <strong>{{ activityFactorText }}</strong>
          <small>反映你的日常活动量，数值越高说明全天消耗越高。</small>
        </div>

        <div class="basis-card metric">
          <span>TDEE</span>
          <strong>{{ tdeeText }}</strong>
          <small>表示估算的全天总消耗热量，系统会据此计算今日推荐。</small>
        </div>

        <div class="basis-card wide">
          <span>执行重点</span>
          <strong class="text-block">{{ executionFocus }}</strong>
        </div>

        <div class="basis-card wide">
          <span>近 7 天修正</span>
          <strong class="text-block">{{ recentAdjustment }}</strong>
        </div>
      </div>

      <div class="note-grid">
        <div class="note-card">
          <span>目标影响</span>
          <p>{{ goalImpact }}</p>
        </div>

        <div class="note-card">
          <span>营养方向</span>
          <p>{{ macroDirection }}</p>
        </div>
      </div>

      <p v-if="refreshMessage" class="refresh-message">{{ refreshMessage }}</p>
    </div>

    <aside class="hero-side">
      <div class="target-card">
        <span>今日目标热量</span>
        <strong>{{ caloriesTarget }}</strong>
        <small>kcal</small>
      </div>

      <div class="mini-grid">
        <div class="mini-card">
          <span>轨迹总热量</span>
          <strong>{{ totalCalories }}</strong>
          <small>kcal</small>
        </div>
        <div class="mini-card">
          <span>推荐餐次数</span>
          <strong>{{ mealCount }}</strong>
          <small>餐</small>
        </div>
      </div>

      <div class="refresh-panel">
        <strong>已记录饮食？点我刷新一下</strong>
        <span>系统会保留已进食餐次，只重算还没吃的推荐。</span>
        <el-button class="refresh-btn" type="primary" :loading="refreshing" @click="$emit('refresh')">
          刷新今日推荐
        </el-button>
      </div>
    </aside>
  </section>
</template>

<style scoped lang="scss">
.hero-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) 300px;
  gap: 12px;
  padding: 18px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 232, 211, 0.95), transparent 40%),
    linear-gradient(135deg, rgba(255, 250, 244, 0.96), rgba(255, 239, 223, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 32px rgba(249, 115, 22, 0.11);
  animation: fade-up 0.45s ease;
}

.hero-main {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.hero-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-kicker,
.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-copy h1 {
  margin: 8px 0 6px;
  font-size: clamp(26px, 2.6vw, 34px);
  line-height: 1.05;
  color: #7c2d12;
}

.hero-copy p {
  margin: 0;
  color: #7c2d12;
  line-height: 1.6;
  font-size: 14px;
}

.hero-chip,
.date-pill,
.goal-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 12px;
}

.hero-chip {
  background: rgba(255, 255, 255, 0.84);
  color: #9a3412;
  border: 1px solid rgba(255, 215, 177, 0.85);
}

.hero-chip.warm {
  background: #fff0e1;
}

.hero-chip.refresh {
  background: #ecfccb;
  color: #3f6212;
  border-color: #bef264;
}

.hero-chip.lock {
  background: #eff6ff;
  color: #1d4ed8;
  border-color: #bfdbfe;
}

.date-pill {
  color: #9a3412;
  background: #fff0e1;
  border: 1px solid #ffd7b1;
}

.goal-pill {
  color: #7c2d12;
  background: #ffedd5;
  border: 1px solid #fdba74;
}

.stat-grid,
.basis-grid,
.note-grid,
.mini-grid {
  display: grid;
  gap: 10px;
}

.stat-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.basis-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.note-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card,
.basis-card,
.note-card,
.target-card,
.mini-card,
.refresh-panel {
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(255, 246, 238, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 22px rgba(249, 115, 22, 0.08);
}

.stat-card,
.basis-card,
.note-card,
.mini-card {
  padding: 12px 14px;
}

.stat-card span,
.basis-card span,
.note-card span,
.target-card span,
.mini-card span {
  display: block;
  color: #94a3b8;
  font-size: 12px;
}

.stat-card strong,
.basis-card strong,
.target-card strong,
.mini-card strong {
  display: block;
  margin-top: 6px;
  color: #7c2d12;
  line-height: 1.1;
}

.stat-card strong {
  font-size: 24px;
}

.stat-card strong.good {
  color: #15803d;
}

.stat-card strong.warn,
.stat-card strong.warm {
  color: #b45309;
}

.stat-card strong.cool {
  color: #0f766e;
}

.stat-card small,
.basis-card small,
.target-card small,
.mini-card small {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.45;
}

.basis-card.metric strong {
  font-size: 28px;
}

.basis-card.wide .text-block {
  font-size: 15px;
  line-height: 1.5;
}

.note-card p {
  margin: 6px 0 0;
  color: #7c2d12;
  font-size: 13px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.refresh-message {
  margin: 0;
  color: #9a3412;
  font-size: 12px;
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.target-card {
  padding: 14px;
  text-align: center;
}

.target-card strong {
  font-size: 38px;
}

.mini-card {
  text-align: center;
}

.mini-card strong {
  font-size: 26px;
}

.refresh-panel {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  border-color: #fdba74;
}

.refresh-panel strong {
  color: #9a3412;
  font-size: 14px;
}

.refresh-panel span {
  color: #7c2d12;
  font-size: 12px;
  line-height: 1.5;
}

.refresh-btn {
  width: 100%;
  min-height: 42px;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.24);
}

@media (max-width: 1200px) {
  .hero-shell {
    grid-template-columns: 1fr;
  }

  .hero-side {
    order: -1;
  }
}

@media (max-width: 900px) {
  .stat-grid,
  .basis-grid,
  .note-grid,
  .mini-grid {
    grid-template-columns: 1fr;
  }
}
</style>
