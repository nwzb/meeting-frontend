<template>
  <transition name="fade">
    <div class="fullscreen-overlay" v-if="isExpanded" @click="toggleExpand"></div>
  </transition>

  <div :class="['embedded-assistant-card feishu-card', { 'is-expanded': isExpanded }]">
    <div class="chat-header">
      <div class="header-left">
        <div class="header-title">
          <el-icon class="title-icon"><Opportunity /></el-icon>
          <span>全局会议 AI 助手</span>
        </div>
        <span class="header-desc">基于历史会议提供精准解答</span>
      </div>

      <div class="header-actions">
        <el-tooltip content="清空对话记录" placement="top">
          <el-button class="action-btn" circle @click="clearChat">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>

        <el-tooltip :content="isExpanded ? '退出放大' : '放大面板'" placement="top">
          <el-button class="action-btn" circle @click="toggleExpand">
            <el-icon><FullScreen v-if="!isExpanded" /><CopyDocument v-else /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="chat-body" ref="chatBodyRef">
      <div class="welcome-msg" v-if="messageList.length === 0">
        你好！我是你的智能会议管家。你可以问我比如：“最近关于前端架构是怎么讨论的？”
      </div>

      <div
          v-for="(msg, index) in messageList"
          :key="index"
          :class="['message-item', msg.role === 'user' ? 'is-user' : 'is-ai']"
      >
        <div class="avatar">
          <el-icon v-if="msg.role === 'ai'"><Monitor /></el-icon>
          <el-icon v-else><User /></el-icon>
        </div>

        <div class="msg-content">
          <div class="text-bubble" :class="{ 'loading-bubble': msg.status === 'loading' }">
            <template v-if="msg.status === 'loading'">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </template>
            <template v-else>
              {{ msg.content }}
            </template>
          </div>

          <div class="sources-wrapper" v-if="msg.sources && msg.sources.length > 0">
            <div class="source-title">
              <el-icon><Link /></el-icon> 参考片段：
            </div>
            <div class="source-card" v-for="(src, sIdx) in msg.sources" :key="sIdx">
              <div class="source-meta">
                <span class="tag-meeting">{{ src.meetingName }}</span>
                <span class="tag-time">{{ formatDate(src.meetingTime) }}</span>
              </div>
              <div class="source-text">
                <strong>{{ src.speaker }}:</strong> {{ src.text }}
              </div>
            </div>
          </div>

          <div class="error-text" v-if="msg.status === 'error'">
            <el-icon><Warning /></el-icon> {{ msg.errorMsg }}
          </div>
        </div>
      </div>
    </div>

    <div class="chat-footer">
      <el-input
          v-model="inputText"
          type="textarea"
          :rows="isExpanded ? 3 : 2"
          resize="none"
          placeholder="向 AI 提问..."
          @keydown.enter.prevent="sendMessage"
          :disabled="isGenerating"
      />
      <el-button
          type="primary"
          class="send-btn"
          :loading="isGenerating"
          :disabled="!inputText.trim()"
          @click="sendMessage"
          circle
      >
        <el-icon v-if="!isGenerating"><Position /></el-icon>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { Opportunity, Monitor, User, Position, Link, Warning, FullScreen, CopyDocument, Delete } from '@element-plus/icons-vue'
import { askRag } from '@/api/dashboard'
import type { RagSource } from '@/api/dashboard'
import { ElMessage, ElMessageBox } from 'element-plus'

// ★ 修复点 3：定义本地缓存的 Key
const CHAT_STORAGE_KEY = 'rag_assistant_chat_history'

const inputText = ref('')
const isGenerating = ref(false)
const chatBodyRef = ref<HTMLElement | null>(null)

const isExpanded = ref(false)
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
  scrollToBottom()
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  status?: 'success' | 'loading' | 'error'
  errorMsg?: string
  sources?: RagSource[]
}

const messageList = ref<ChatMessage[]>([])

// ★ 修复点 3：页面加载时读取历史记录
onMounted(() => {
  const savedHistory = localStorage.getItem(CHAT_STORAGE_KEY)
  if (savedHistory) {
    try {
      const parsed = JSON.parse(savedHistory)
      // 过滤掉上次意外遗留的 loading 状态消息
      messageList.value = parsed.filter((m: ChatMessage) => m.status !== 'loading')
      scrollToBottom()
    } catch (e) {
      console.error('解析聊天记录失败', e)
    }
  }
})

// ★ 修复点 3：监听数组变化，随时保存到本地
watch(messageList, (newVal) => {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newVal))
}, { deep: true })

// 清空对话方法
const clearChat = () => {
  if (messageList.value.length === 0) return
  ElMessageBox.confirm('确定要清空当前的对话记录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    messageList.value = []
    localStorage.removeItem(CHAT_STORAGE_KEY)
    ElMessage.success('对话已清空')
  }).catch(() => {})
}

const formatDate = (dateStr?: string) => {
  if (!dateStr || dateStr === '未知时间') return '未知时间'
  return dateStr.split('T')[0]?.split(' ')[0] ?? '未知时间'
}

const scrollToBottom = async () => {
  await nextTick()
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTop = chatBodyRef.value.scrollHeight
  }
}

const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isGenerating.value) return

  messageList.value.push({ role: 'user', content: text })
  inputText.value = ''
  scrollToBottom()

  const aiMsgIndex = messageList.value.length
  messageList.value.push({ role: 'ai', content: '', status: 'loading' })
  isGenerating.value = true
  scrollToBottom()

  try {
    const res = await askRag(text)
    if (res.code === 200 && res.data) {
      messageList.value[aiMsgIndex] = {
        role: 'ai',
        content: res.data.answer,
        status: 'success',
        sources: res.data.sources
      }
    } else {
      messageList.value[aiMsgIndex] = {
        role: 'ai',
        content: '',
        status: 'error',
        errorMsg: res.msg || '检索失败，请重试'
      }
      ElMessage.warning(res.msg || '检索失败')
    }
  } catch (error: any) {
    messageList.value[aiMsgIndex] = {
      role: 'ai',
      content: '',
      status: 'error',
      errorMsg: '网络或服务异常'
    }
  } finally {
    isGenerating.value = false
    scrollToBottom()
  }
}
</script>

<style scoped lang="scss">
/* ====== 基础嵌入模式样式 ====== */
.embedded-assistant-card {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-overlay);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  height: 100%;

  &:hover:not(.is-expanded) {
    box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08);
  }
}

/* ====== ★ 修复点 1：调整沉浸模式的 z-index 防止遮挡 Tooltip ====== */
.fullscreen-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000; /* 从 2999 降到 1000 */
}

.embedded-assistant-card.is-expanded {
  position: fixed;
  top: 50px;
  bottom: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  max-width: 90vw;
  height: auto;
  z-index: 1001; /* 从 3000 降到 1001，确保在 overlay 之上，但在 tooltip (2000+) 之下 */
  box-shadow: 0 24px 72px rgba(0, 0, 0, 0.25);
  border-radius: 16px;

  .chat-body {
    padding: 30px 40px;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* ====== 内部布局样式 ====== */
.chat-header {
  padding: 16px 20px;
  background: linear-gradient(to right, rgba(51, 112, 255, 0.08), transparent);
  border-bottom: 1px solid var(--el-border-color-extra-light);
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    flex-direction: column;
  }

  .header-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s;

    .title-icon {
      color: var(--el-color-primary);
      font-size: 18px;
      transition: all 0.3s;
    }
  }

  .header-desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    transition: all 0.3s;
  }

  .header-actions {
    display: flex;
    gap: 8px;

    .action-btn {
      border: none;
      background: transparent;
      font-size: 18px;
      color: var(--el-text-color-secondary);
      &:hover {
        color: var(--el-color-primary);
        background: var(--el-fill-color-light);
      }
    }
  }
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: var(--el-fill-color-extra-light);
  display: flex;
  flex-direction: column;
  gap: 20px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--el-border-color); border-radius: 3px; }
}

.welcome-msg {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
  margin-bottom: 10px;
  transition: all 0.3s;
}

.message-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  &.is-user {
    flex-direction: row-reverse;
    .text-bubble {
      background: var(--el-color-primary);
      color: white;
      border-bottom-right-radius: 4px;
    }
  }

  &.is-ai {
    .text-bubble {
      background: white;
      color: var(--el-text-color-primary);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--el-border-color-lighter);
    }
  }
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-fill-color-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.msg-content {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.text-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
  transition: all 0.3s;
}

.loading-bubble {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
}
.dot {
  width: 6px;
  height: 6px;
  background-color: var(--el-color-primary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.error-text {
  font-size: 12px;
  color: var(--el-color-danger);
  display: flex;
  align-items: center;
  gap: 4px;
}

.sources-wrapper {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .source-title {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
    transition: all 0.3s;
  }

  .source-card {
    background: white;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 10px;
    font-size: 12px;
    line-height: 1.4;
    transition: all 0.3s;

    .source-meta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;

      .tag-meeting {
        color: var(--el-color-primary);
        font-weight: 500;
        background: var(--el-color-primary-light-9);
        padding: 2px 6px;
        border-radius: 4px;
        transition: all 0.3s;
      }
      .tag-time {
        color: var(--el-text-color-placeholder);
      }
    }

    .source-text {
      color: var(--el-text-color-regular);
      strong {
        color: var(--el-text-color-primary);
      }
    }
  }
}

.chat-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid var(--el-border-color-extra-light);
  display: flex;
  gap: 12px;
  align-items: flex-end;
  transition: all 0.3s;

  :deep(.el-textarea__inner) {
    border-radius: 8px;
    background: var(--el-fill-color-light);
    border: none;
    box-shadow: none;
    transition: all 0.3s;
    &:focus { background: white; box-shadow: 0 0 0 1px var(--el-color-primary) inset; }
  }

  .send-btn {
    margin-bottom: 4px;
    transition: all 0.3s;
  }
}

/* ====== ★ 沉浸式放大模式的专属排版 ====== */
.embedded-assistant-card.is-expanded {
  .header-title {
    font-size: 22px;
    .title-icon { font-size: 24px; }
  }
  .header-desc {
    font-size: 14px;
    margin-top: 6px;
  }

  .header-actions {
    .action-btn { font-size: 22px; }
  }

  .welcome-msg {
    font-size: 15px;
    margin-bottom: 16px;
  }

  .text-bubble {
    font-size: 16px;
    line-height: 1.6;
    padding: 14px 18px;
  }

  .source-title {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .source-card {
    font-size: 14px;
    padding: 14px;
    line-height: 1.5;

    .source-meta {
      margin-bottom: 10px;
      .tag-meeting { font-size: 13px; padding: 4px 8px; }
    }
  }

  .chat-footer {
    padding: 20px 24px;

    :deep(.el-textarea__inner) {
      font-size: 16px;
      padding: 12px 16px;
    }

    .send-btn {
      width: 48px;
      height: 48px;
      margin-left: 8px;

      .el-icon { font-size: 20px; }
    }
  }
}
</style>