<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Cpu, Loading, Pointer, Promotion, Refresh, Service } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getDailyReportAPI } from '@/api/chat'
import { getAnalysisReportAPI } from '@/api/analysis'
import { useUserIdentity } from '@/composables/useUserIdentity'
import { useUserStore } from '@/stores/user'
import { getLocalDateOffsetString } from '@/utils/date'

type ChatMessage = {
  role: 'user' | 'ai'
  content: string
}

type ChatPageState = {
  userInput: string
  chatList: ChatMessage[]
  dailyReport: string
  reportDate: string
  reportEmptyTip: string
  quickQuestions: string[]
}

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const { resolveUserId } = useUserIdentity()

const loadingReport = ref(false)
const quickQuestionLoading = ref(false)
const reportDate = ref(getLocalDateOffsetString(-1))
const reportEmptyTip = ref('暂无昨日复盘')
const reportLoadingText = ref('正在生成昨日饮食复盘...')
const dailyReport = ref('')

const userInput = ref('')
const isTyping = ref(false)
const chatList = ref<ChatMessage[]>([])
const scrollContainer = ref<HTMLElement | null>(null)
const lastHandledRouteQuestion = ref('')
const quickQuestionDate = ref('')
let quickQuestionRequestId = 0

let reportTimer: ReturnType<typeof setInterval> | null = null

const storageKey = computed(() => `yunshan-chat:${userStore.userInfo.id || 'guest'}`)

const defaultFastQuestions = [
  '今天摄入热量是否超标？',
  '晚餐怎么吃更适合控脂？',
  '明天三餐怎么安排更均衡？'
]
const fastQuestions = ref<string[]>([...defaultFastQuestions])

const readRouteQueryValue = (value: unknown) => {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim()
  return ''
}

const normalizeQuestions = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value.map(item => String(item || '').trim()).filter(Boolean).slice(0, 5)
}

const normalizeText = (text: string) =>
  text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

const normalizeStreamChunk = (text: string) =>
  text
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')

const parseSseData = (block: string) => {
  const dataLines = block
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map((line) => {
      let content = line.slice(5)
      if (content.startsWith(' ')) {
        content = content.slice(1)
      }
      return content
    })

  if (!dataLines.length) return ''
  if (dataLines.every(line => line === '')) return '\n'
  return dataLines.join('\n')
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const renderInlineMessageHtml = (text: string) =>
  escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')

const legacyNormalizeAiDisplayText = (text: string) =>
  normalizeText(text)
    .replace(/([：:])\s*(\d+[.)、])/g, '$1\n$2')
    .replace(/[ \t]*-\s*\n\s*/g, '\n- ')
    .replace(/([。；;）)])\s*-\s+/g, '$1\n- ')
    .replace(/\n{3,}/g, '\n\n')

const legacyIsMessageTitleLine = (line: string) =>
  /^\d+[.)、]\s*/.test(line) ||
  /^【.+】[:：]?$/.test(line) ||
  /^\*\*.+\*\*$/.test(line)

const legacyRenderMessageHtml = (message: ChatMessage) => {
  const raw = String(message.content || '')
  if (!raw) return ''

  if (message.role !== 'ai') {
    return escapeHtml(raw).replace(/\n/g, '<br />')
  }

  const lines = normalizeAiDisplayText(raw)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const htmlParts: string[] = []
  const listItems: string[] = []

  const flushList = () => {
    if (!listItems.length) return
    htmlParts.push(`<ul>${listItems.join('')}</ul>`)
    listItems.length = 0
  }

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s*(.+)$/)
    if (bulletMatch) {
      listItems.push(`<li>${renderInlineMessageHtml(bulletMatch[1])}</li>`)
      continue
    }

    flushList()

    if (isMessageTitleLine(line)) {
      htmlParts.push(`<p class="msg-title">${renderInlineMessageHtml(line)}</p>`)
      continue
    }

    htmlParts.push(`<p>${renderInlineMessageHtml(line)}</p>`)
  }

  flushList()
  return htmlParts.join('')
}

void [legacyNormalizeAiDisplayText, legacyIsMessageTitleLine, legacyRenderMessageHtml]

const normalizeAiDisplayText = (text: string) =>
  normalizeText(text)
    .replace(/([：:])[ \t]*(\d+[.)、])/g, '$1\n$2')
    .replace(/([。；;：:）)])[ \t]*(\d+[.)、])/g, '$1\n$2')
    .replace(/[ \t]*-\s*\n\s*/g, '\n- ')
    .replace(/([。；;：:）)])[ \t]*-\s+/g, '$1\n- ')
    .replace(/\n{3,}/g, '\n\n')

const isMessageTitleLine = (line: string) =>
  /^【.+】[:：]?$/.test(line) ||
  /^\*\*.+\*\*$/.test(line)

const renderMessageHtml = (message: ChatMessage) => {
  const raw = String(message.content || '')
  if (!raw) return ''

  if (message.role !== 'ai') {
    return escapeHtml(raw).replace(/\n/g, '<br />')
  }

  const lines = normalizeAiDisplayText(raw)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const htmlParts: string[] = []
  const listItems: string[] = []
  const orderedItems: string[] = []
  let currentOrderedItem = ''
  let hasCurrentOrderedItem = false

  const flushList = () => {
    if (!listItems.length) return
    htmlParts.push(`<ul>${listItems.join('')}</ul>`)
    listItems.length = 0
  }

  const flushOrderedItem = () => {
    if (!hasCurrentOrderedItem) return
    const content = currentOrderedItem.trim()
    if (content) {
      orderedItems.push(content)
    }
    currentOrderedItem = ''
    hasCurrentOrderedItem = false
  }

  const flushOrderedList = () => {
    flushOrderedItem()
    if (!orderedItems.length) return
    htmlParts.push(`<ol class="msg-ordered-list">${orderedItems.map(item => `<li>${item}</li>`).join('')}</ol>`)
    orderedItems.length = 0
  }

  for (const line of lines) {
    const orderedMatch = line.match(/^(\d+[.)、])\s*(.*)$/)
    if (orderedMatch) {
      flushList()
      flushOrderedItem()
      hasCurrentOrderedItem = true
      currentOrderedItem = renderInlineMessageHtml(orderedMatch[2] || '')
      continue
    }

    const bulletMatch = line.match(/^[-*•]\s*(.+)$/)
    if (bulletMatch) {
      if (hasCurrentOrderedItem) {
        const addition = renderInlineMessageHtml(bulletMatch[1])
        currentOrderedItem = currentOrderedItem ? `${currentOrderedItem}<br />- ${addition}` : `- ${addition}`
      } else {
        flushOrderedList()
        listItems.push(`<li>${renderInlineMessageHtml(bulletMatch[1])}</li>`)
      }
      continue
    }

    if (isMessageTitleLine(line)) {
      flushList()
      flushOrderedList()
      htmlParts.push(`<p class="msg-title">${renderInlineMessageHtml(line)}</p>`)
      continue
    }

    if (hasCurrentOrderedItem) {
      const addition = renderInlineMessageHtml(line)
      currentOrderedItem = currentOrderedItem ? `${currentOrderedItem}<br />${addition}` : addition
      continue
    }

    flushList()
    flushOrderedList()
    htmlParts.push(`<p>${renderInlineMessageHtml(line)}</p>`)
  }

  flushList()
  flushOrderedList()
  return htmlParts.join('')
}

const normalizeBlockKey = (text: string) =>
  normalizeText(text)
    .replace(/[【】:：]/g, '')
    .replace(/\s+/g, '')

const cleanTitle = (text: string) =>
  normalizeText(text)
    .replace(/^[\d.\-、，,\s]+/, '')
    .replace(/[：:\s]+$/, '')
    .trim()

const cleanContent = (text: string) =>
  normalizeText(text)
    .replace(/^[-•·、，,\s]+/, '')
    .trim()

const getBlockType = (title: string) => {
  if (title.includes('优秀') || title.includes('达标') || title.includes('做得好')) return 'success'
  if (title.includes('提醒') || title.includes('注意') || title.includes('风险') || title.includes('问题')) return 'warning'
  return 'info'
}

const getTargetReportDate = () => getLocalDateOffsetString(-1)

const persistState = () => {
  const payload: ChatPageState = {
    userInput: userInput.value,
    chatList: chatList.value,
    dailyReport: dailyReport.value,
    reportDate: reportDate.value,
    reportEmptyTip: reportEmptyTip.value,
    quickQuestions: fastQuestions.value
  }
  sessionStorage.setItem(storageKey.value, JSON.stringify(payload))
}

const restoreState = () => {
  const raw = sessionStorage.getItem(storageKey.value)
  if (!raw) return

  try {
    const state = JSON.parse(raw) as Partial<ChatPageState>
    userInput.value = typeof state.userInput === 'string' ? state.userInput : ''
    chatList.value = Array.isArray(state.chatList) ? state.chatList : []
    dailyReport.value = typeof state.dailyReport === 'string' ? state.dailyReport : ''
    reportDate.value = typeof state.reportDate === 'string' ? state.reportDate : getTargetReportDate()
    const storedQuestions = normalizeQuestions(state.quickQuestions)
    fastQuestions.value = storedQuestions.length ? storedQuestions : [...defaultFastQuestions]
    quickQuestionDate.value = storedQuestions.length ? reportDate.value : ''
    reportEmptyTip.value = typeof state.reportEmptyTip === 'string' ? state.reportEmptyTip : '暂无昨日复盘'
  } catch (_) {
    sessionStorage.removeItem(storageKey.value)
  }
}

const parseReportBlocks = (text: string) => {
  const raw = normalizeText(text)
  if (!raw) return []

  const chunks = raw
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

  const sectionRegex = /【([^】]+)】[:：]?\s*([\s\S]*?)(?=(?:\n?【[^】]+】[:：]?\s*)|$)/g
  const parsed: Array<{ title: string; content: string; type: string }> = []

  if (chunks.length === 1) {
    const single = chunks[0]
    const matches = [...single.matchAll(sectionRegex)]
    if (matches.length) {
      for (const match of matches) {
        const title = cleanTitle(match[1] || '分析')
        const content = cleanContent(match[2] || '暂无内容')
        parsed.push({ title, content, type: getBlockType(title) })
      }
    }
  }

  if (!parsed.length) {
    for (const chunk of chunks) {
      const matches = [...chunk.matchAll(sectionRegex)]
      if (matches.length) {
        for (const match of matches) {
          const title = cleanTitle(match[1] || '分析')
          const content = cleanContent(match[2] || '暂无内容')
          parsed.push({ title, content, type: getBlockType(title) })
        }
        continue
      }

      const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean)
      const firstLine = lines[0] || `建议 ${parsed.length + 1}`
      const title = cleanTitle(firstLine) || `建议 ${parsed.length + 1}`
      const contentSource = lines.length > 1 ? lines.slice(1).join('\n') : firstLine
      const content = cleanContent(contentSource) || '暂无内容'
      parsed.push({ title, content, type: getBlockType(title) })
    }
  }

  const seen = new Set<string>()
  return parsed.filter((item) => {
    const key = normalizeBlockKey(`${item.title}\n${item.content}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const reportBlocks = computed(() => parseReportBlocks(dailyReport.value))

const skeletonCards = computed(() => [
  { title: '正在读取昨日饮食记录', lines: 3 },
  { title: '正在分析热量与营养分布', lines: 2 },
  { title: '正在整理可执行建议', lines: 3 }
])

const fetchQuickQuestions = async (date: string, force = false) => {
  if (!force && quickQuestionDate.value === date && fastQuestions.value.length) {
    return
  }

  const requestId = ++quickQuestionRequestId
  quickQuestionLoading.value = !fastQuestions.value.length
  try {
    const userId = await resolveUserId()
    if (!userId) {
      if (requestId === quickQuestionRequestId) {
        fastQuestions.value = [...defaultFastQuestions]
        quickQuestionDate.value = ''
      }
      return
    }

    const res = await getAnalysisReportAPI({ userId, date })
    const questions = normalizeQuestions(res.data?.quickQuestions)
    if (requestId === quickQuestionRequestId) {
      fastQuestions.value = questions.length ? questions : [...defaultFastQuestions]
      quickQuestionDate.value = date
    }
  } catch {
    if (requestId === quickQuestionRequestId && !fastQuestions.value.length) {
      fastQuestions.value = [...defaultFastQuestions]
    }
  } finally {
    if (requestId === quickQuestionRequestId) {
      quickQuestionLoading.value = false
    }
  }
}

const fetchReport = async (showHint = false) => {
  loadingReport.value = true
  dailyReport.value = ''
  reportDate.value = getTargetReportDate()
  reportLoadingText.value = '正在生成昨日饮食复盘...'

  const loadingSteps = [
    '正在读取昨日饮食记录...',
    '正在分析热量与营养分布...',
    '正在生成复盘建议...'
  ]

  let stepIndex = 0
  const stepTimer = window.setInterval(() => {
    stepIndex = (stepIndex + 1) % loadingSteps.length
    reportLoadingText.value = loadingSteps[stepIndex]
  }, 2200)

  try {
    void fetchQuickQuestions(reportDate.value, true)
    const res = await getDailyReportAPI(reportDate.value)
    dailyReport.value = normalizeText(res.data || '')
    reportEmptyTip.value = `${reportDate.value} 暂无复盘数据`
  } catch (error) {
    reportEmptyTip.value = '加载昨日复盘失败'
    if (showHint) {
      ElMessage.error('无法加载昨日复盘，请稍后重试')
    }
  } finally {
    window.clearInterval(stepTimer)
    loadingReport.value = false
    persistState()
  }
}

const syncReportByDate = (force = false) => {
  const target = getTargetReportDate()
  if (force || target !== reportDate.value || !dailyReport.value) {
    fetchReport()
    return
  }

  if (!fastQuestions.value.length || quickQuestionDate.value !== target) {
    void fetchQuickQuestions(target)
  }
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    syncReportByDate()
  }
}

const onWindowFocus = () => {
  syncReportByDate()
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

const clearRouteQuestion = () => {
  const nextQuery = { ...route.query }
  delete nextQuery.q
  delete nextQuery.from
  delete nextQuery.ts
  router.replace({ path: route.path, query: nextQuery })
}

const sendMessage = async (preset?: string) => {
  const message = (preset || userInput.value).trim()
  if (!message || isTyping.value) return

  chatList.value.push({ role: 'user', content: message })
  userInput.value = ''
  isTyping.value = true
  chatList.value.push({ role: 'ai', content: '' })
  const aiIndex = chatList.value.length - 1
  persistState()
  scrollToBottom()

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: userStore.token
      },
      body: JSON.stringify({ message })
    })

    if (!response.ok) throw new Error('stream request failed')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      for (const block of blocks) {
        let content = parseSseData(block)
        const trimmedContent = content.trim()
        if (trimmedContent === '[DONE]') continue
        if (!content) continue

        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
          try {
            const payload = JSON.parse(trimmedContent)
            content = payload?.content ?? payload?.text ?? payload?.answer ?? payload?.message ?? payload?.data ?? ''
          } catch (_) {}
        }

        const normalized = normalizeStreamChunk(String(content ?? ''))
        if (normalized.length > 0) {
          chatList.value[aiIndex].content += normalized
          persistState()
        }
      }

      scrollToBottom()
    }

    if (buffer.trim()) {
      let content = parseSseData(buffer)
      const trimmedContent = content.trim()
      if (content && trimmedContent !== '[DONE]') {
        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
          try {
            const payload = JSON.parse(trimmedContent)
            content = payload?.content ?? payload?.text ?? payload?.answer ?? payload?.message ?? payload?.data ?? ''
          } catch (_) {}
        }

        const normalized = normalizeStreamChunk(String(content ?? ''))
        if (normalized.length > 0) {
          chatList.value[aiIndex].content += normalized
          persistState()
        }
      }
    }
  } catch (error) {
    chatList.value[aiIndex].content = '抱歉，云膳 AI 当前连接异常，请稍后再试。'
    persistState()
  } finally {
    isTyping.value = false
    persistState()
    scrollToBottom()
  }
}

const consumeRouteQuestion = async () => {
  const question = readRouteQueryValue(route.query.q)
  const stamp = readRouteQueryValue(route.query.ts)
  const key = `${question}::${stamp}`

  if (!question || isTyping.value || key === lastHandledRouteQuestion.value) return

  lastHandledRouteQuestion.value = key
  userInput.value = question
  clearRouteQuestion()
  await nextTick()
  await sendMessage(question)
}

watch([chatList, userInput, dailyReport, reportDate, reportEmptyTip, fastQuestions], () => {
  persistState()
}, { deep: true })

watch(() => [route.query.q, route.query.ts], () => {
  void consumeRouteQuestion()
})

watch(isTyping, (value) => {
  if (!value) {
    void consumeRouteQuestion()
  }
})

onMounted(async () => {
  restoreState()
  const targetDate = getTargetReportDate()
  if (reportDate.value !== targetDate || !dailyReport.value) {
    fetchReport()
  } else if (!fastQuestions.value.length || quickQuestionDate.value !== targetDate) {
    void fetchQuickQuestions(targetDate)
  }
  await consumeRouteQuestion()
  await scrollToBottom()
  reportTimer = setInterval(() => syncReportByDate(), 60000)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', onWindowFocus)
})

onUnmounted(() => {
  if (reportTimer) clearInterval(reportTimer)
  persistState()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', onWindowFocus)
})
</script>

<template>
  <div class="chat-container">
    <el-row :gutter="25" class="full-height">
      <el-col :xs="24" :sm="24" :md="15" :lg="15" class="full-height">
        <el-card class="glass-effect chat-card">
          <template #header>
            <div class="chat-header">
              <el-icon class="ai-pulse"><Cpu /></el-icon>
              <span>智膳伴侣 · 云膳 AI</span>
              <el-tag v-if="isTyping" size="small" type="warning" effect="plain" round class="typing-tag">
                云膳 AI 思考中...
              </el-tag>
            </div>
          </template>

          <div ref="scrollContainer" class="message-list">
            <div class="msg-row ai">
              <div class="avatar-fixed ai-icon"><el-icon><Cpu /></el-icon></div>
              <div class="bubble ai-bubble">
                你好，我是云膳 AI。你可以问我热量、营养比例、饮食安排，我会结合你的记录给出建议。
              </div>
            </div>

            <div
              v-for="(item, index) in chatList"
              :key="index"
              :class="['msg-row', item.role]"
              :style="{ animationDelay: `${index * 0.03}s` }"
            >
              <div v-if="item.role === 'ai'" class="avatar-fixed ai-icon"><el-icon><Cpu /></el-icon></div>

              <div class="bubble" :class="item.role + '-bubble'">
                <div class="bubble-content" v-html="renderMessageHtml(item)" />
                <el-icon v-if="isTyping && index === chatList.length - 1 && item.role === 'ai'" class="is-loading inline-loading">
                  <Loading />
                </el-icon>
              </div>

              <div v-if="item.role === 'user'" class="avatar-fixed">
                <el-avatar
                  :size="40"
                  :src="userStore.userInfo.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'"
                />
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

      <el-col :xs="24" :sm="24" :md="9" :lg="9" class="side-column">
        <el-card class="glass-effect report-card">
          <template #header>
            <div class="flex-between">
              <b>云膳 AI 昨日饮食复盘</b>
              <div class="report-head-right">
                <el-tag round effect="plain" size="small">{{ reportDate }}</el-tag>
                <el-button :icon="Refresh" circle size="small" @click="fetchReport(true)" />
              </div>
            </div>
          </template>

          <div v-if="loadingReport" class="report-loading">
            <div class="loading-title">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>{{ reportLoadingText }}</span>
            </div>
            <p class="loading-subtitle">复盘生成通常需要几秒，请稍候，内容生成后会自动显示。</p>
            <div class="report-skeleton-list">
              <div v-for="item in skeletonCards" :key="item.title" class="skeleton-card">
                <div class="skeleton-card-title">{{ item.title }}</div>
                <el-skeleton animated>
                  <template #template>
                    <el-skeleton-item
                      v-for="line in item.lines"
                      :key="`${item.title}-${line}`"
                      variant="text"
                      class="skeleton-line"
                    />
                  </template>
                </el-skeleton>
              </div>
            </div>
          </div>

          <div v-else-if="dailyReport" class="report-content-scroll">
            <div v-for="block in reportBlocks" :key="block.title + block.content" class="report-block" :class="block.type">
              <div class="block-title">【{{ block.title }}】</div>
              <p class="block-content">{{ block.content }}</p>
            </div>
          </div>

          <el-empty v-else :description="reportEmptyTip" :image-size="60" />
        </el-card>

        <el-card
          class="glass-effect fast-card"
          element-loading-text="正在同步快捷提问..."
        >
          <template #header>
            <b><el-icon><Pointer /></el-icon> 快捷问题</b>
          </template>

          <div v-if="quickQuestionLoading && fastQuestions.length" class="quick-sync-text">快捷提问同步中...</div>

          <div v-if="quickQuestionLoading && !fastQuestions.length" class="fast-q-grid">
            <el-skeleton v-for="index in 3" :key="`q-skeleton-${index}`" animated>
              <template #template>
                <el-skeleton-item variant="text" class="fast-q-skeleton" />
              </template>
            </el-skeleton>
          </div>

          <div v-else class="fast-q-grid">
            <div v-for="question in fastQuestions" :key="question" class="q-item" @click="sendMessage(question)">
              {{ question }}
            </div>
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
.chat-container {
  height: calc(100vh - 120px);
  padding: 5px;
}

.full-height {
  height: 100%;
}

.side-column {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 35px !important;
  animation: fade-up 0.45s ease;
}

.chat-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.chat-header {
  display: flex;
  align-items: center;
  font-weight: 700;
  color: #9a3412;
}

.typing-tag {
  margin-left: 10px;
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.msg-row {
  display: flex;
  gap: 15px;
  max-width: 90%;
  animation: fade-up 0.35s ease both;
}

.msg-row.ai {
  align-self: flex-start;
}

.msg-row.user {
  align-self: flex-end;
}

.avatar-fixed {
  flex-shrink: 0;
}

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
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bubble-content p,
.bubble-content ul,
.bubble-content ol {
  margin: 0;
}

.bubble-content ul,
.bubble-content ol {
  padding-left: 18px;
}

.bubble-content ol {
  list-style: decimal;
}

.bubble-content li + li {
  margin-top: 4px;
}

.bubble-content .msg-title {
  font-weight: 700;
}

.ai-bubble .bubble-content .msg-title {
  color: #9a3412;
}

.bubble-content strong {
  font-weight: 700;
}

.bubble-content code {
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  font-size: 12px;
}

.ai-bubble {
  background: #fff3e5 !important;
  color: #0f172a;
  border: 1px solid rgba(255, 184, 132, 0.55);
  border-top-left-radius: 4px;
}

.user-bubble {
  background: #ff7a18 !important;
  color: #fff;
  border-top-right-radius: 4px;
  box-shadow: 0 8px 20px rgba(255, 122, 24, 0.25);
}

.inline-loading {
  margin-left: 8px;
}

.input-area {
  padding: 25px;
}

.input-capsule {
  background: #fff;
  border-radius: 30px;
  padding: 6px 6px 6px 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 10px 25px rgba(255, 122, 24, 0.1);
}

.input-capsule input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
}

.report-card,
.fast-card {
  display: flex;
  flex-direction: column;
  animation: fade-up 0.5s ease;
}

.report-card {
  height: 45%;
}

.fast-card {
  flex: 1;
  margin-top: 20px;
}

.report-card :deep(.el-card__body),
.fast-card :deep(.el-card__body) {
  flex: 1;
  overflow-y: auto;
}

.report-card :deep(.el-card__body) {
  padding: 20px;
}

.fast-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.report-loading {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.loading-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c2410c;
  font-weight: 700;
}

.loading-subtitle {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.report-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 247, 237, 0.92);
  border: 1px solid rgba(255, 237, 213, 0.95);
}

.skeleton-card-title {
  margin-bottom: 10px;
  color: #9a3412;
  font-size: 13px;
  font-weight: 700;
}

.skeleton-line {
  height: 14px;
  margin-bottom: 10px;
}

.report-content-scroll {
  height: 100%;
  overflow-y: auto;
}

.report-block {
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.85);
}

.report-block.warning {
  background: rgba(245, 158, 11, 0.1);
}

.report-block.warning .block-title {
  color: #b45309;
}

.report-block.success {
  background: rgba(255, 122, 24, 0.09);
}

.report-block.success .block-title {
  color: #c2410c;
}

.report-block.info {
  background: rgba(255, 234, 214, 0.75);
}

.report-block.info .block-title {
  color: #c2410c;
}

.block-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
}

.block-content {
  margin: 0;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.7;
  white-space: pre-wrap;
}

.fast-q-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quick-sync-text {
  margin-bottom: 10px;
  color: #c2410c;
  font-size: 12px;
  font-weight: 600;
}

.fast-q-skeleton {
  height: 40px;
  border-radius: 15px;
}

.q-item {
  padding: 12px 18px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.4) !important;
  font-size: 13px;
  cursor: pointer;
  color: #4a5568;
  transition: all 0.2s;
}

.q-item:hover {
  background: #ff7a18 !important;
  color: #fff;
  transform: translateX(5px);
}

.ai-branding-decor {
  text-align: center;
  padding: 20px 0;
  opacity: 0.85;
}

.ai-branding-decor p {
  font-size: 11px;
  color: #ea580c;
  font-weight: 700;
  margin-top: 10px;
}

.ai-pulse {
  animation: pulse 2s infinite;
  color: #ff7a18;
  margin-right: 8px;
}

.flex-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.report-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@media (max-width: 960px) {
  .chat-container,
  .full-height,
  .side-column {
    height: auto;
  }

  .chat-card {
    min-height: 520px;
    margin-bottom: 16px;
  }

  .report-card {
    height: 360px;
  }

  .fast-card {
    min-height: 260px;
    margin-top: 16px;
  }
}
</style>
