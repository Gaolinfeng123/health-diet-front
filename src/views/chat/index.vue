<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { getDailyReportAPI } from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { Cpu, Promotion, Refresh, Loading, Service, Pointer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getLocalDateOffsetString } from '@/utils/date'

const userStore = useUserStore()
const loadingReport = ref(false)
const dailyReport = ref('')
const reportDate = ref(getLocalDateOffsetString(-1))
const reportEmptyTip = ref('暂无昨日复盘')
const userInput = ref('')
const isTyping = ref(false)
const chatList = ref<{ role: 'user' | 'ai'; content: string }[]>([])
const scrollContainer = ref<HTMLElement | null>(null)
let reportTimer: ReturnType<typeof setInterval> | null = null

const normalizeReportText = (text: string) =>
  text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .trim()

const normalizeStreamText = (text: string) =>
  text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')

const cleanTitle = (text: string) =>
  normalizeReportText(text)
    .replace(/^[：:、，,\s]+/, '')
    .replace(/[：:\s]+$/, '')
    .trim()

const cleanContent = (text: string) =>
  normalizeReportText(text)
    .replace(/^[-•\s：:、，,]+/, '')
    .trim()

const getBlockType = (title: string) => {
  if (title.includes('优秀') || title.includes('达标')) return 'success'
  if (title.includes('提醒') || title.includes('注意') || title.includes('风险')) return 'warning'
  return 'info'
}

const getTargetReportDate = () => getLocalDateOffsetString(-1)

const fetchReport = async (showHint = false) => {
  loadingReport.value = true
  reportDate.value = getTargetReportDate()
  dailyReport.value = ''
  try {
    const res = await getDailyReportAPI(reportDate.value)
    dailyReport.value = normalizeReportText(res.data || '')
    reportEmptyTip.value = `${reportDate.value} 暂无复盘数据`
  } catch (e) {
    reportEmptyTip.value = '加载昨日复盘失败'
    if (showHint) {
      ElMessage.error('无法加载昨日复盘，请稍后重试')
    }
  } finally {
    loadingReport.value = false
  }
}

const syncReportByDate = () => {
  const targetDate = getTargetReportDate()
  if (targetDate !== reportDate.value) {
    fetchReport()
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    fetchReport()
  }
}

const onWindowFocus = () => {
  fetchReport()
}

const reportBlocks = computed(() => {
  if (!dailyReport.value) return []
  const normalized = normalizeReportText(dailyReport.value)
  const blocks = [...normalized.matchAll(/【([^】]+)】([\s\S]*?)(?=【|$)/g)]
  if (blocks.length) {
    return blocks.map((item) => {
      const title = cleanTitle(item[1] || '分析') || '分析'
      const content = cleanContent(item[2] || '暂无内容') || '暂无内容'
      return { title, content, type: getBlockType(title) }
    })
  }
  return normalized
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((content, index) => ({ title: `建议 ${index + 1}`, content: cleanContent(content), type: 'info' }))
})

const sendMessage = async (presetMsg?: string) => {
  const msg = (presetMsg || userInput.value).trim()
  if (!msg || isTyping.value) return

  chatList.value.push({ role: 'user', content: msg })
  userInput.value = ''
  isTyping.value = true
  chatList.value.push({ role: 'ai', content: '' })
  const aiIndex = chatList.value.length - 1

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: userStore.token
      },
      body: JSON.stringify({ message: msg })
    })
    if (!response.ok) throw new Error('stream request failed')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        let content = trimmed.slice(5).trimStart()
        if (!content || content === '[DONE]') continue

        if (content.startsWith('{') && content.endsWith('}')) {
          try {
            const payload = JSON.parse(content)
            content = payload?.content ?? payload?.text ?? payload?.answer ?? payload?.message ?? payload?.data ?? ''
          } catch (e) {
            // 忽略 JSON 解析失败，按纯文本处理
          }
        }

        content = normalizeStreamText(content)
        if (content) chatList.value[aiIndex].content += content
      }
      scrollToBottom()
    }
  } catch (error) {
    chatList.value[aiIndex].content = '抱歉，云膳 AI 当前连接异常，请稍后再试。'
  } finally {
    isTyping.value = false
    scrollToBottom()
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const fastQs = ['今天摄入热量是否超标？', '晚餐怎么吃更适合控脂？', '明天三餐怎么安排更均衡？']

onMounted(() => {
  fetchReport()
  reportTimer = setInterval(syncReportByDate, 60000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', onWindowFocus)
})

onUnmounted(() => {
  if (reportTimer) clearInterval(reportTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', onWindowFocus)
})
</script>

<template>
  <div class="chat-container">
    <el-row :gutter="25" class="h-full">
      <el-col :xs="24" :sm="24" :md="15" :lg="15" class="h-full">
        <el-card class="glass-effect chat-card">
          <template #header>
            <div class="chat-header">
              <el-icon class="ai-pulse"><Cpu /></el-icon>
              <span>智膳伴侣 · 云膳 AI</span>
              <el-tag v-if="isTyping" size="small" type="warning" effect="plain" round class="ml-10">
                云膳 AI 思考中...
              </el-tag>
            </div>
          </template>

          <div ref="scrollContainer" class="message-list">
            <div class="msg-row ai">
              <div class="avatar-fixed ai-icon"><el-icon><Cpu /></el-icon></div>
              <div class="bubble ai-bubble">
                你好，我是云膳 AI。你可以问我热量、营养比例、饮食安排，我会结合记录给你建议。
              </div>
            </div>

            <div v-for="(item, index) in chatList" :key="index" :class="['msg-row', item.role]" :style="{ animationDelay: `${index * 0.03}s` }">
              <div v-if="item.role === 'ai'" class="avatar-fixed ai-icon"><el-icon><Cpu /></el-icon></div>

              <div class="bubble" :class="item.role + '-bubble'">
                {{ item.content }}
                <el-icon v-if="isTyping && index === chatList.length - 1 && item.role === 'ai'" class="is-loading">
                  <Loading />
                </el-icon>
              </div>

              <div v-if="item.role === 'user'" class="avatar-fixed">
                <el-avatar :size="40" :src="userStore.userInfo.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              </div>
            </div>
          </div>

          <div class="input-area">
            <div class="input-capsule">
              <input v-model="userInput" placeholder="问问云膳 AI..." @keyup.enter="sendMessage()" />
              <el-button type="primary" circle :icon="Promotion" :disabled="isTyping" @click="sendMessage()" />
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="24" :md="9" :lg="9" class="h-full flex-col">
        <el-card class="glass-effect report-card" v-loading="loadingReport">
          <template #header>
            <div class="flex-between">
              <b>昨日饮食复盘</b>
              <div class="report-head-right">
                <el-tag round effect="plain" size="small">{{ reportDate }}</el-tag>
                <el-button :icon="Refresh" circle size="small" @click="fetchReport(true)" />
              </div>
            </div>
          </template>
          <div v-if="dailyReport" class="report-content-scroll">
            <div v-for="b in reportBlocks" :key="b.title + b.content" class="report-block" :class="b.type">
              <div class="b-title">{{ b.title }}</div>
              <p class="b-content">{{ b.content }}</p>
            </div>
          </div>
          <el-empty v-else :description="reportEmptyTip" :image-size="60" />
        </el-card>

        <el-card class="glass-effect fast-card flex-1 mt-20">
          <template #header>
            <b><el-icon><Pointer /></el-icon> 快捷问题</b>
          </template>
          <div class="fast-q-grid">
            <div v-for="q in fastQs" :key="q" class="q-item" @click="sendMessage(q)">{{ q }}</div>
          </div>

          <div class="ai-branding-decor">
            <el-icon :size="60" color="rgba(249,115,22,0.24)"><Service /></el-icon>
            <p>云膳 AI 已连接</p>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.chat-container { height: calc(100vh - 120px); padding: 5px; }
.h-full { height: 100%; }
.flex-col { display: flex; flex-direction: column; }
.flex-1 { flex: 1; }
.mt-20 { margin-top: 20px; }
.ml-10 { margin-left: 10px; }

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 35px !important;
  animation: fade-up 0.45s ease;
  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
}

.chat-header {
  display: flex;
  align-items: center;
  font-weight: bold;
  color: #9a3412;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 25px;

  .msg-row {
    display: flex;
    gap: 15px;
    max-width: 90%;
    animation: fade-up 0.35s ease both;

    &.ai { align-self: flex-start; }
    &.user { align-self: flex-end; }

    .avatar-fixed { flex-shrink: 0; }
    .ai-icon {
      width: 40px;
      height: 40px;
      border-radius: 14px;
      background: #ff7a18;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    .bubble {
      padding: 14px 20px;
      border-radius: 22px;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;

      &.ai-bubble {
        background: #fff3e5 !important;
        color: #0f172a;
        border: 1px solid rgba(255, 184, 132, 0.55);
        border-top-left-radius: 4px;
      }
      &.user-bubble {
        background: #ff7a18 !important;
        color: #fff;
        border-top-right-radius: 4px;
        box-shadow: 0 8px 20px rgba(255, 122, 24, 0.25);
      }
    }
  }
}

.input-area {
  padding: 25px;
  .input-capsule {
    background: #fff;
    border-radius: 30px;
    padding: 6px 6px 6px 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 10px 25px rgba(255, 122, 24, 0.1);

    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 14px;
      background: transparent;
    }
  }
}

.report-card {
  height: 45%;
  display: flex;
  flex-direction: column;
  animation: fade-up 0.5s ease;
  :deep(.el-card__body) {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
}

.report-block {
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.85);
  &.warning { background: rgba(245, 158, 11, 0.1); .b-title { color: #b45309; } }
  &.success { background: rgba(255, 122, 24, 0.09); .b-title { color: #c2410c; } }
  &.info { background: rgba(255, 234, 214, 0.75); .b-title { color: #c2410c; } }
  .b-title { font-weight: bold; font-size: 13px; margin-bottom: 5px; }
  .b-content { font-size: 12px; color: #4b5563; margin: 0; line-height: 1.6; }
}

.fast-card {
  display: flex;
  flex-direction: column;
  animation: fade-up 0.55s ease;
  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .fast-q-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    .q-item {
      padding: 12px 18px;
      border-radius: 15px;
      background: rgba(255, 255, 255, 0.4) !important;
      font-size: 13px;
      cursor: pointer;
      color: #4a5568;
      transition: all 0.2s;
      &:hover {
        background: #ff7a18 !important;
        color: #fff;
        transform: translateX(5px);
      }
    }
  }
}

.ai-branding-decor {
  text-align: center;
  padding: 20px 0;
  opacity: 0.85;
  p {
    font-size: 11px;
    color: #ea580c;
    font-weight: bold;
    margin-top: 10px;
  }
}

.ai-pulse {
  animation: pulse 2s infinite;
  color: #ff7a18;
  margin-right: 8px;
}
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.flex-between { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.report-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 960px) {
  .chat-container {
    height: auto;
  }
  .h-full {
    height: auto;
  }
  .chat-card {
    min-height: 520px;
    margin-bottom: 16px;
  }
  .report-card {
    height: 320px;
  }
  .fast-card {
    min-height: 260px;
    margin-bottom: 8px;
  }
}
</style>
