<script setup lang="ts">
import RecommendHero from './components/RecommendHero.vue'
import RecommendMacroCard from './components/RecommendMacroCard.vue'
import RecommendMealBoard from './components/RecommendMealBoard.vue'
import RecommendSummaryCard from './components/RecommendSummaryCard.vue'
import RecommendTipsCard from './components/RecommendTipsCard.vue'
import { useRecommend } from './useRecommend'

const {
  bodyStatus,
  dailySummary,
  dailyReasons,
  extraAdvice,
  goalLabel,
  loading,
  loadingText,
  mealCards,
  pfcItems,
  recommendData,
  reportDateLabel,
  refreshInfo,
  refreshing,
  refreshRecommend,
  summary,
  summaryReasons,
  summaryTextFormatted,
  toNumber
} = useRecommend()
</script>

<template>
  <div class="recommend-page">
    <section v-if="loading && !recommendData" class="loading-shell glass-effect">
      <div class="loading-copy">
        <span class="loading-pill">今日推荐生成中</span>
        <h1>正在准备你的今日饮食计划</h1>
        <p>{{ loadingText }}</p>
      </div>

      <div class="loading-hero-grid">
        <div class="loading-panel warm">
          <span class="panel-label">目标热量</span>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="h1" class="hero-line hero-line-lg" />
              <el-skeleton-item variant="text" class="hero-line hero-line-sm" />
            </template>
          </el-skeleton>
        </div>

        <div class="loading-panel">
          <span class="panel-label">推荐概览</span>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" class="hero-line" />
              <el-skeleton-item variant="text" class="hero-line" />
              <el-skeleton-item variant="text" class="hero-line hero-line-sm" />
            </template>
          </el-skeleton>
        </div>
      </div>

      <div class="loading-grid">
        <div class="loading-card">
          <span class="card-kicker">营养配比</span>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item v-for="index in 4" :key="`macro-${index}`" variant="text" class="skeleton-line" />
            </template>
          </el-skeleton>
        </div>

        <div class="loading-card">
          <span class="card-kicker">推荐摘要</span>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item v-for="index in 5" :key="`summary-${index}`" variant="text" class="skeleton-line" />
            </template>
          </el-skeleton>
        </div>

        <div class="loading-card">
          <span class="card-kicker">执行建议</span>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item v-for="index in 4" :key="`tips-${index}`" variant="text" class="skeleton-line" />
            </template>
          </el-skeleton>
        </div>
      </div>

      <div class="loading-meals">
        <div v-for="index in 3" :key="`meal-${index}`" class="meal-skeleton-card">
          <div class="meal-skeleton-head">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="text" class="meal-chip-line" />
                <el-skeleton-item variant="text" class="meal-chip-line short" />
              </template>
            </el-skeleton>
          </div>
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="h3" class="meal-title-line" />
              <el-skeleton-item variant="text" class="skeleton-line" />
              <el-skeleton-item variant="text" class="skeleton-line" />
              <el-skeleton-item variant="text" class="skeleton-line short" />
            </template>
          </el-skeleton>
        </div>
      </div>
    </section>

    <template v-else-if="recommendData">
      <RecommendHero
        :report-date-label="reportDateLabel"
        :goal-label="goalLabel"
        :body-status="bodyStatus"
        :key-message="summary?.keyMessage || '按推荐节奏吃好三餐，把热量和宏量控制在今天的计划里。'"
        :daily-summary-text="dailySummary?.summaryText || ''"
        :bmi="toNumber(summary?.bmi)"
        :calories-target="Math.round(toNumber(summary?.caloriesTarget))"
        :activity-factor="toNumber(summary?.activityFactor)"
        :tdee="toNumber(summary?.tdee)"
        :total-calories="Math.round(toNumber(dailySummary?.totalCalories))"
        :meal-count="mealCards.length"
        :refreshing="refreshing"
        :refresh-message="refreshInfo?.message || ''"
        :is-refreshed="Boolean(refreshInfo?.refreshed)"
        :locked-meals="refreshInfo?.lockedMeals || []"
        :summary-reasons="summaryReasons"
        @refresh="refreshRecommend"
      />

      <RecommendMealBoard :meals="mealCards" :to-number="toNumber" />

      <section class="dashboard-grid">
        <RecommendMacroCard :items="pfcItems" />
        <RecommendSummaryCard
          :html="summaryTextFormatted"
          :summary-reasons="summaryReasons"
          :daily-reasons="dailyReasons"
        />
        <RecommendTipsCard :tips="extraAdvice" />
      </section>
    </template>

    <el-empty v-else description="暂无今日推荐" :image-size="90" />
  </div>
</template>

<style scoped lang="scss">
.recommend-page {
  padding-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.loading-shell {
  padding: 22px;
  border-radius: 26px;
  background:
    radial-gradient(circle at top left, rgba(255, 232, 211, 0.95), transparent 42%),
    linear-gradient(135deg, rgba(255, 250, 244, 0.96), rgba(255, 239, 223, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.92);
  box-shadow: 0 16px 32px rgba(249, 115, 22, 0.11);
}

.loading-copy h1 {
  margin: 10px 0 8px;
  font-size: clamp(28px, 2.8vw, 38px);
  line-height: 1.05;
  color: #7c2d12;
}

.loading-copy p {
  margin: 0;
  color: #7c2d12;
  line-height: 1.7;
  font-size: 14px;
}

.loading-pill,
.panel-label,
.card-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
}

.loading-pill {
  padding: 6px 12px;
  background: #fff0e1;
  color: #9a3412;
  border: 1px solid #ffd7b1;
}

.loading-hero-grid,
.loading-grid,
.loading-meals {
  display: grid;
  gap: 14px;
}

.loading-hero-grid {
  margin-top: 18px;
  grid-template-columns: 1.05fr 1fr;
}

.loading-panel,
.loading-card,
.meal-skeleton-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.08);
}

.loading-panel {
  padding: 18px;
}

.loading-panel.warm {
  background: linear-gradient(145deg, rgba(255, 244, 232, 0.92), rgba(255, 255, 255, 0.86));
}

.panel-label,
.card-kicker {
  margin-bottom: 12px;
  padding: 5px 10px;
  background: #ffedd5;
  color: #9a3412;
}

.hero-line,
.skeleton-line,
.meal-chip-line,
.meal-title-line {
  width: 100%;
  margin-bottom: 10px;
}

.hero-line-lg {
  height: 48px;
}

.hero-line-sm,
.skeleton-line.short {
  width: 65%;
}

.loading-grid {
  margin-top: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.loading-card {
  padding: 16px;
}

.loading-meals {
  margin-top: 14px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.meal-skeleton-card {
  padding: 14px;
}

.meal-skeleton-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.meal-chip-line {
  height: 18px;
}

.meal-chip-line.short {
  width: 42%;
}

.meal-title-line {
  height: 28px;
  margin-top: 8px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1.05fr 1fr 1fr;
  gap: 14px;
}

@media (max-width: 1400px) {
  .loading-hero-grid,
  .loading-grid,
  .loading-meals,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
</style>
