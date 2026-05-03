<template>
  <div class="agenda-container">
    <el-empty v-if="!agendas.length" description="AI 正在分析章节..." />
    <div
        v-for="(item, index) in agendas"
        :key="index"
        class="agenda-item"
        @click="$emit('jump', item.timestamp)"
    >
      <div class="agenda-marker">
        <div class="dot"></div>
        <div class="line" v-if="index !== agendas.length - 1"></div>
      </div>
      <div class="agenda-content">
        <div class="agenda-time">{{ formatTime(item.timestamp) }}</div>

        <el-input
            v-model="item.title"
            class="stealth-input title-input"
            :readonly="isArchived"
            @click.stop="checkArchived"
        />

        <div
            v-if="editingIndex !== index"
            class="stealth-input render-content summary-render"
            v-html="formatHighlight(item.summary, highlightKeywords, sensitiveKeywords)"
            @click.stop="startEdit(index)"
        ></div>

        <el-input
            v-else
            v-model="item.summary"
            type="textarea"
            autosize
            class="stealth-input summary-input"
            @blur="stopEdit"
            @click.stop
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import type { MeetingAgenda } from '@/types/meeting';
import { formatTime } from '@/utils/timeFormat';

const props = defineProps<{
  agendas: MeetingAgenda[];
  highlightKeywords?: string[];
  sensitiveKeywords?: string[]; // ★ 新增：接收敏感词
  isArchived?: boolean;
  isAuditor: boolean;
}>();

defineEmits(['jump']);

const editingIndex = ref(-1);

const checkArchived = () => {
  if (props.isArchived) {
    const msg = props.isAuditor ? '审查只读模式，无法修改' : '该会议已归档，无法修改';
    ElMessage.warning(msg);
  }
};

const startEdit = (index: number) => {
  if (props.isArchived) {
    const msg = props.isAuditor ? '审查只读模式，无法修改' : '该会议已归档，无法修改';
    ElMessage.warning(msg);
    return; // ★ 核心修复：直接阻断
  }

  editingIndex.value = index;
  nextTick(() => {
    const inputEl = document.querySelector('.summary-input textarea') as HTMLTextAreaElement;
    if (inputEl) inputEl.focus();
  });
};

const stopEdit = () => {
  editingIndex.value = -1;
};

// ★ 核心高亮引擎：修复 TS 隐式 any 并加入红蓝双轨
const formatHighlight = (text: string, keywords?: string[], sensitiveWords?: string[]) => {
  if (!text) return '暂无内容';
  let resultText = text;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (sensitiveWords && sensitiveWords.length > 0) {
    const validSensitive = sensitiveWords.filter((k: string) => k.trim());
    if (validSensitive.length > 0) {
      const pattern = validSensitive.map(escapeRegExp).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      resultText = resultText.replace(regex, '<span class="sensitive-highlight">$1</span>');
    }
  }

  if (keywords && keywords.length > 0) {
    const validKeywords = keywords.filter((k: string) => k.trim());
    if (validKeywords.length > 0) {
      const pattern = validKeywords.map(escapeRegExp).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      resultText = resultText.replace(regex, '<span class="keyword-highlight">$1</span>');
    }
  }

  return resultText;
};
</script>

<style scoped lang="scss">
.agenda-container {
  padding: 10px 0;
  .agenda-item {
    display: flex;
    gap: 12px;
    cursor: pointer;
    padding: 12px 8px;
    border-radius: 6px;
    transition: background 0.2s;

    &:hover {
      background-color: #f2f3f5;
    }

    .agenda-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      .dot {
        width: 8px;
        height: 8px;
        background: #337ecc;
        border-radius: 50%;
        margin-top: 6px;
      }
      .line {
        flex: 1;
        width: 1px;
        background: #dee0e3;
        margin: 4px 0;
      }
    }

    .agenda-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      .agenda-time { font-size: 12px; color: #86909c; margin-left: 6px; }
    }
  }
}

/* === 沉浸式输入框核心样式 === */
.stealth-input {
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    box-shadow: none !important;
    background: transparent;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.2s, box-shadow 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
    &:focus {
      background: #fff;
      box-shadow: 0 0 0 1px var(--el-color-primary) !important;
    }
  }
}

.title-input {
  :deep(.el-input__inner) {
    font-size: 14px;
    font-weight: 600;
    color: #1d2129;
  }
}

.summary-input {
  :deep(.el-textarea__inner) {
    font-size: 13px;
    color: #4e5969;
    line-height: 1.5;
    resize: none;
  }
}

/* === 预览态渲染层样式 === */
.render-content {
  white-space: pre-wrap;
  word-break: break-all;
  cursor: text;
  min-height: 24px;
}

.summary-render {
  font-size: 13px;
  color: #4e5969;
  line-height: 1.5;
}

/* === 核心高亮样式：飞书高级蓝 === */
:deep(.keyword-highlight) {
  background-color: rgba(51, 126, 204, 0.15);
  color: #337ecc;
  font-weight: 600;
  padding: 0 4px;
  margin: 0 2px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(51, 126, 204, 0.25);
  }
}

/* === ★ 新增高亮样式：警示红 === */
:deep(.sensitive-highlight) {
  background-color: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
  font-weight: 600;
  text-decoration: line-through;
  padding: 0 4px;
  margin: 0 2px;
  border-radius: 4px;
  border: 1px dashed #f56c6c;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(245, 108, 108, 0.25);
  }
}
</style>