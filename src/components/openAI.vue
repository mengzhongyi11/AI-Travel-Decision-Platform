<template>
  <div
    class="background"
    :style="{ width: panelWidth + 'vw' }"
  >
    <div class="drag-handle" @mousedown="startDrag">
      <div class="drag-handle-grip"></div>
    </div>
    <div class="card-AI" v-if="contexts.length === 0">
      <div class="title">Hello，有 什 么 要 问 的 吗 ？</div>
      <div class="box">
        <div class="box-text" @click="setContext('根据你的位置规划旅游路线吗？')">
          <span class="icon">📍</span>
          根据你的位置规划旅游路线吗？
        </div>
        <div class="box-text" @click="setContext('推荐沿途景点吗？')">
          <span class="icon">🏞️</span>
          推荐沿途景点吗？
        </div>
        <div class="box-text" @click="setContext('今天旅游建议？')">
          <span class="icon">💡</span>
          今天旅游建议？
        </div>
      </div>
    </div>

    <div class="context-box" ref="contextBox">
      <div class="context-card" :class="item.type" v-for="(item, index) in contexts" :key="index">
        <!-- AI 回复：使用 v-html 渲染转换后的 HTML -->
        <div
          v-if="item.type === 'ai'"
          class="ai-content"
          v-html="item.html || formatAIContent(item.content)"
        ></div>
        <!-- 用户消息：纯文本 -->
        <div v-else class="user-content">{{ item.content }}</div>
      </div>

      <!-- 加载状态 -->
      <div v-if="isLoading" class="context-card ai loading">
        <div class="dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
      </div>
    </div>

    <div class="input-card">
      <div class="input-wrapper">
        <textarea
          ref="textareaRef"
          class="input"
          :class="{ focused: isFocused }"
          placeholder="有什么想问的？"
          v-model="context"
          @keydown.enter="handleKeydown"
          @focus="isFocused = true"
          @blur="isFocused = false"
          @input="adjustHeight"
          rows="1"
          :disabled="isLoading"
        ></textarea>
        <button
          class="send-btn"
          :class="{ active: context.trim() && !isLoading }"
          @click="submitContext"
          :disabled="!context.trim() || isLoading"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { useCollect } from '@/stores/from'

interface Message {
  type: 'user' | 'ai'
  content: string
  html?: string
}

const collectStore = useCollect()
const context = ref('')
const contexts = ref<Message[]>([])
const isFocused = ref(false)
const isLoading = ref(false)
const textareaRef = ref<HTMLTextAreaElement>()
const contextBox = ref<HTMLDivElement>()

// 面板拖拽缩放
const panelWidth = ref(40)
const isDragging = ref(false)
let dragStartX = 0
let dragStartWidth = 40

function startDrag(e: MouseEvent) {
  isDragging.value = true
  dragStartX = e.clientX
  dragStartWidth = panelWidth.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return
  const deltaX = e.clientX - dragStartX
  const vwDelta = (deltaX / window.innerWidth) * 100
  // 左边缘拖拽：往右拖（deltaX 正）→ 面板变窄
  let newWidth = dragStartWidth - vwDelta
  newWidth = Math.max(30, Math.min(50, newWidth))
  panelWidth.value = Math.round(newWidth)
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  stopDrag()
})

// chunk 缓冲 & 帧率控制
let pendingBuffer = ''
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_INTERVAL = 50 // ms，约 20fps

function flushContent() {
  const msg = contexts.value[contexts.value.length - 1]
  if (!msg || !pendingBuffer || msg.type !== 'ai') return

  msg.content += pendingBuffer
  msg.html = formatAIContent(msg.content)
  pendingBuffer = ''
  flushTimer = null
  scrollToBottom()
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushContent, FLUSH_INTERVAL)
}

// ==================== 内容格式化函数（核心修复）====================

const formatAIContent = (content: string): string => {
  if (!content) return ''

  let html = content

  // 1. HTML 转义（防 XSS）
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 2. 处理 Markdown 表格（修复点：识别 | 分隔的表格）
  html = parseMarkdownTable(html)

  // 3. 处理换行符（必须在表格解析之后）
  // 将剩余的 \n 转为 <br>，但保留表格结构
  html = html.replace(/\n/g, '<br>')

  // 4. 处理 Markdown 标题
  html = html
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // 5. 处理粗体和斜体
  html = html
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/___(.*?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')

  // 6. 处理 emoji 和特殊标记
  html = html.replace(
    /(📍|🏞️|🏯|🌙|🚌|💰|✅|⚠️|🌧️|☀️|⛅|🌟|🔸|🔹|▸|•|→)/g,
    '<span class="emoji">$1</span>',
  )

  // 7. 处理代码块
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 8. 处理链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')

  return html
}

// 解析 Markdown 表格
const parseMarkdownTable = (text: string): string => {
  const lines = text.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 检测表格行（包含 | 且不是代码块）
    if (line.includes('|') && !line.startsWith('    ') && !line.startsWith('\t')) {
      // 收集连续的行形成表格
      const tableLines: string[] = []
      let j = i

      while (j < lines.length && lines[j].includes('|')) {
        tableLines.push(lines[j])
        j++
      }

      // 至少需要 2 行（表头 + 分隔符）才构成表格
      if (tableLines.length >= 2) {
        const tableHtml = convertTableLines(tableLines)
        result.push(tableHtml)
        i = j
        continue
      }
    }

    result.push(line)
    i++
  }

  return result.join('\n')
}

// 将表格行转换为 HTML
const convertTableLines = (lines: string[]): string => {
  // 过滤掉分隔符行 (|---|---|...)
  const contentLines = lines.filter((line) => !line.match(/^\s*\|?[\s\-:|]+\|?\s*$/))

  if (contentLines.length === 0) return ''

  let html = '<table class="ai-table">\n<thead>\n'

  // 第一行是表头
  const headers = parseTableRow(contentLines[0])
  html += '<tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr>\n'
  html += '</thead>\n<tbody>\n'

  // 剩余行是数据
  for (let i = 1; i < contentLines.length; i++) {
    const cells = parseTableRow(contentLines[i])
    // 处理单元格内的 <br> 标签（将 \n 转为 <br>）
    html +=
      '<tr>' +
      cells
        .map((c) => {
          const cellContent = c.replace(/\n/g, '<br>')
          return `<td>${cellContent}</td>`
        })
        .join('') +
      '</tr>\n'
  }

  html += '</tbody>\n</table>'
  return html
}

// 解析表格行，处理 | 分隔符
const parseTableRow = (line: string): string[] => {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell !== '')
}

// ==================== 其他函数 ====================

const adjustHeight = () => {
  const textarea = textareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  const newHeight = Math.min(textarea.scrollHeight, 150)
  textarea.style.height = newHeight + 'px'
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!e.shiftKey) {
    e.preventDefault()
    submitContext()
  }
}

const setContext = (text: string) => {
  context.value = text
  nextTick(() => {
    adjustHeight()
    textareaRef.value?.focus()
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (contextBox.value) {
      contextBox.value.scrollTop = contextBox.value.scrollHeight
    }
  })
}

const submitContext = () => {
  const trimmed = context.value.trim()
  if (!trimmed || isLoading.value) return

  contexts.value.push({ type: 'user', content: trimmed })
  context.value = ''
  isLoading.value = true
  scrollToBottom()

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  })

  getAIcontext(trimmed)
}

async function getAIcontext(data: string) {
  console.log('用户提问：', data)
  const url = '/openai/chat'
  const historyContext = collectStore.data || []

  try {
    const response = await fetch('http://localhost:3001' + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: data, context: historyContext }),
    })

    if (!response.ok) throw new Error(`HTTP 错误，状态码：${response.status}`)

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    const aiMessageIndex = contexts.value.length
    contexts.value.push({ type: 'ai', content: '', html: '' })

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        // 放入缓冲区，由 scheduleFlush 定时刷入 DOM（帧率优化）
        pendingBuffer += chunk
        scheduleFlush()
      }
    }

    // 确保最后一批缓冲区内容被刷新
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = null
    flushContent()
    isLoading.value = false
  } catch (error) {
    console.error('请求接口失败：', error)
    isLoading.value = false
    contexts.value.push({ type: 'ai', content: '抱歉，请求失败了，请稍后重试。', html: '抱歉，请求失败了，请稍后重试。' })
    scrollToBottom()
  }
}
</script>

<style scoped>
/* ==================== 基础变量 ==================== */
/* 全局变量 - 使用 :global() 突破 scoped 限制 */
:global(:root) {
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --bg-gradient: linear-gradient(205deg, #93f2ff 0%, #ffffff 100%);
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.5);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 4px 20px rgba(102, 126, 234, 0.15);
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --text-primary: #1a1a1a;
  --text-secondary: #333;
  --text-muted: #999;
  --user-bubble: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --ai-bubble: rgba(255, 255, 255, 0.95);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ==================== 滚动条 ==================== */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

/* ==================== 拖拽手柄 ==================== */
.drag-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  z-index: 100;
  transition: background-color 0.2s;
}
.drag-handle:hover,
.drag-handle:active {
  background-color: #667eea;
}

.drag-handle-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 24px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.2s;
}
.drag-handle:hover .drag-handle-grip,
.drag-handle:active .drag-handle-grip {
  opacity: 1;
  background: #fff;
}

/* ==================== 主容器 ==================== */
.background {
  position: fixed;
  top: 0;
  right: 0;
  width: 40vw;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: var(--bg-gradient);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  z-index: 1000;
}

/* ==================== 欢迎卡片 ==================== */
.card-AI {
  width: 100%;
  padding: 15vh 20px 5vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  animation: fadeIn 0.6s ease-out;
  flex-shrink: 0;
}

.title {
  font-size: clamp(1.25rem, 4vw, 1.5rem);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 2rem;
  letter-spacing: 2px;
  line-height: 1.4;
}

.box {
  width: 90%;
  max-width: 500px;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--glass-border);
}

.box-text {
  padding: 14px 18px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.box-text:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  background: rgba(255, 255, 255, 1);
}

.icon {
  font-size: 1.3rem;
  line-height: 1;
}

/* ==================== 消息容器 ==================== */
.context-box {
  flex: 1;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  padding-bottom: 140px;
}

/* ==================== 消息气泡 ==================== */
.context-card {
  max-width: 85%;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  font-size: 0.95rem;
  line-height: 1.7;
  word-wrap: break-word;
  overflow-wrap: break-word;
  animation: slideIn 0.3s ease-out;
  position: relative;
}

.context-card.user {
  align-self: flex-end;
  background: var(--user-bubble);
  color: white;
  border-bottom-right-radius: 4px;
  margin-left: 15%;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  animation: slideInRight 0.3s ease-out;
}

.context-card.ai {
  align-self: flex-start;
  background: var(--ai-bubble);
  color: var(--text-secondary);
  border-bottom-left-radius: 4px;
  margin-right: 15%;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(0, 0, 0, 0.05);
  animation: slideInLeft 0.3s ease-out;
}

/* ==================== AI 内容格式化（核心）==================== */
.ai-content {
  line-height: 1.8;
}

/* 表格样式 - 关键修复 */
.ai-content :deep(.ai-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 0.9rem;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  border: 1px solid #e8e8e8;
}

.ai-content :deep(.ai-table thead) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.ai-content :deep(.ai-table th) {
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid #dee2e6;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ai-content :deep(.ai-table td) {
  padding: 12px 10px;
  border-bottom: 1px solid #e9ecef;
  vertical-align: top;
  line-height: 1.6;
}

.ai-content :deep(.ai-table tr:last-child td) {
  border-bottom: none;
}

.ai-content :deep(.ai-table tr:hover) {
  background: #f8f9ff;
}

/* 表格内的换行 */
.ai-content :deep(.ai-table td br) {
  display: block;
  margin-bottom: 4px;
}

/* 标题样式 */
.ai-content :deep(h1),
.ai-content :deep(h2),
.ai-content :deep(h3) {
  margin: 20px 0 12px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}

.ai-content :deep(h1) {
  font-size: 1.3rem;
}
.ai-content :deep(h2) {
  font-size: 1.15rem;
  color: #667eea;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 8px;
}
.ai-content :deep(h3) {
  font-size: 1rem;
}

/* 段落和换行 */
.ai-content :deep(p) {
  margin: 0 0 12px 0;
}

.ai-content :deep(br) {
  display: block;
  margin-bottom: 8px;
  content: '';
}

/* 列表 */
.ai-content :deep(ul),
.ai-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.ai-content :deep(li) {
  margin: 6px 0;
  line-height: 1.6;
}

/* 强调文本 */
.ai-content :deep(strong) {
  font-weight: 600;
  color: var(--text-primary);
}

.ai-content :deep(em) {
  font-style: italic;
  color: #555;
}

/* Emoji 样式 */
.ai-content :deep(.emoji) {
  font-size: 1.1em;
  line-height: 1;
  margin-right: 2px;
}

/* 代码 */
.ai-content :deep(code) {
  background: #f4f4f4;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 0.9em;
  color: #e83e8c;
}

/* 链接 */
.ai-content :deep(a) {
  color: #667eea;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.ai-content :deep(a:hover) {
  border-bottom-color: #667eea;
}

/* 引用块 */
.ai-content :deep(blockquote) {
  border-left: 4px solid #667eea;
  padding-left: 16px;
  margin: 12px 0;
  color: #666;
  font-style: italic;
  background: #f8f9fa;
  padding: 12px 12px 12px 16px;
  border-radius: 0 8px 8px 0;
}

/* 分隔线 */
.ai-content :deep(hr) {
  border: none;
  height: 1px;
  background: linear-gradient(to right, transparent, #ddd, transparent);
  margin: 20px 0;
}

/* 用户内容 */
.user-content {
  white-space: pre-wrap;
  word-break: break-word;
}

/* ==================== 加载动画 ==================== */
.context-card.ai.loading {
  background: rgba(255, 255, 255, 0.7);
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #667eea;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}
.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-card {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.input-wrapper {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: rgba(240, 240, 240, 0.8);
  border-radius: var(--radius-xl);
  padding: 8px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.input-wrapper:focus-within,
.input-wrapper:has(.input.focused) {
  background: white;
  border-color: #667eea;
  box-shadow: var(--shadow-glow);
}

.input {
  flex: 1;
  min-height: 44px;
  max-height: 150px;
  padding: 10px 16px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  line-height: 1.5;
  resize: none;
  font-family: inherit;
  color: var(--text-primary);
  transition: height 0.2s ease;
}

.input::placeholder {
  color: var(--text-muted);
}

.input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: #e0e0e0;
  color: var(--text-muted);
  cursor: not-allowed;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn.active {
  background: var(--primary-gradient);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.send-btn.active:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.send-btn.active:active {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
}

/* ==================== 动画关键帧 ==================== */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .box {
    width: 95%;
    padding: 1rem;
  }
  .box-text {
    padding: 12px 14px;
    font-size: 0.9rem;
  }
  .context-card {
    max-width: 90%;
    padding: 12px 14px;
  }
  .context-card.user {
    margin-left: 5%;
  }
  .context-card.ai {
    margin-right: 5%;
  }
  .input-card {
    padding: 12px 16px 20px;
  }

  /* 移动端表格横向滚动 */
  .ai-content :deep(.ai-table) {
    display: block;
    overflow-x: auto;
    white-space: nowrap;
  }
}

@media (max-width: 480px) {
  .card-AI {
    padding: 10vh 16px 4vh;
  }
  .title {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .context-box {
    padding: 16px;
    padding-bottom: 120px;
  }

  /* 小屏幕表格字体更小 */
  .ai-content :deep(.ai-table) {
    font-size: 0.8rem;
  }
  .ai-content :deep(.ai-table th),
  .ai-content :deep(.ai-table td) {
    padding: 8px 6px;
  }
}
</style>
