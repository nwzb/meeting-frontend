<template>
  <div class="speaker-timeline">
    <el-empty
        v-if="!contents || contents.length === 0"
        description="AI 正在识别音频……"
    />

    <div
        v-for="(item, index) in contents"
        :key="index"
        :class="['bubble-item', { 'is-active': activeIndex === index }]"
        @click="$emit('seek', item.startTime)"
    >
      <div class="avatar-area">
        <el-avatar
            :size="36"
            class="speaker-avatar"
            :style="{ backgroundColor: getSpeakerColor(item.speaker) }"
        >
          {{ item.speaker ? item.speaker[0] : 'U' }}
        </el-avatar>
        <div class="time-mark">{{ formatTime(item.startTime) }}</div>
      </div>
      <div class="content-area">
        <div class="header-line">
          <el-input
              v-model="item.speaker"
              class="stealth-input speaker-name-input"
              :readonly="isArchived"
              @focus="recordOldSpeaker(item.speaker)"
              @blur="submitRenameSpeaker(item.speaker)"
              @click.stop="checkArchived"
          />
        </div>
        <div class="text-bubble">
          <div
              v-if="editingIndex !== index"
              class="stealth-input render-content"
              v-html="formatHighlight(item.content, props.highlightKeywords, props.sensitiveKeywords)"
              @click.stop="startEdit(index)"
          ></div>

          <el-input
              v-else
              v-model="item.content"
              type="textarea"
              autosize
              class="stealth-input content-textarea"
              @blur="stopEdit"
              @click.stop
          />
          <span v-if="isLastAndProcessing(index)" class="cursor">|</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import type { MeetingContent } from '@/types/meeting';
import { formatTime } from '@/utils/timeFormat';

const props = defineProps<{
  contents: MeetingContent[];
  activeIndex: number;
  isProcessing: boolean;
  highlightKeywords?: string[];
  sensitiveKeywords?: string[];
  isArchived?: boolean;
  isAuditor?: boolean;
}>();

const emit = defineEmits(['seek', 'rename-speaker']);

const isLastAndProcessing = (index: number) => {
  return props.isProcessing && index === props.contents.length - 1;
};

// ★ 新增：飞书风格色板与哈希计算函数
const colors = [
  '#FF8A65', // 柔和珊瑚橘
  '#F06292', // 莫兰迪粉
  '#BA68C8', // 暖紫
  '#4DB6AC', // 暖青 (调剂色，防视觉疲劳)
  '#7986CB', // 柔和蓝紫
  '#81C784', // 暖绿 (调剂色)
  '#FFD54F', // 柔和明黄
  '#FFB74D', // 浅橙
  '#A1887F', // 暖咖色
  '#E57373'  // 柔和砖红
];

const getSpeakerColor = (name?: string) => {
  if (!name) return '#909399';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const oldSpeakerName = ref('');

const recordOldSpeaker = (name: string) => {
  if (props.isArchived) return;
  oldSpeakerName.value = name;
};

const submitRenameSpeaker = (newName: string) => {
  if (props.isArchived) return;
  if (newName && oldSpeakerName.value && newName !== oldSpeakerName.value) {
    emit('rename-speaker', oldSpeakerName.value, newName);
  }
};

const checkArchived = () => {
  if (props.isArchived) {
    const msg = props.isAuditor ? '审计只读模式，无法修改' : '该会议已归档，无法修改';
    ElMessage.warning(msg);
  }
};

const editingIndex = ref(-1);

const startEdit = (index: number) => {
  if (props.isArchived) {
    const msg = props.isAuditor ? '审计只读模式，无法修改' : '该会议已归档，无法修改';
    ElMessage.warning(msg);
    return;
  }

  editingIndex.value = index;
  nextTick(() => {
    const inputEl = document.querySelector('.content-textarea textarea') as HTMLTextAreaElement;
    if (inputEl) inputEl.focus();
  });
};

const stopEdit = () => {
  editingIndex.value = -1;
};

const formatHighlight = (text: string, keywords?: string[], sensitiveWords?: string[]) => {
  if (!text) return '<span style="color: #999">暂无内容</span>';
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

<style lang="scss" scoped>
.speaker-timeline {
  .bubble-item {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;

    &:hover {
      background: #f5f6f7;
    }

    &.is-active {
      background: #e8f3ff;
    }

    .avatar-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      .speaker-avatar {
        color: #fff;
        font-weight: 600;
        transition: background-color 0.3s;
      }
      .time-mark { font-size: 12px; color: #8f959e; margin-top: 4px; }
    }

    .content-area {
      flex: 1;
      .header-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
    }
  }
}
.cursor { color: #337ecc; animation: blink 1s infinite; }
@keyframes blink { 50% { opacity: 0; } }

.stealth-input {
  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    box-shadow: none !important;
    background: transparent;
    padding: 2px 6px;
    border-radius: 4px;
    transition: background 0.2s, box-shadow 0.2s;

    &:hover { background: rgba(0, 0, 0, 0.04); }
    &:focus {
      background: #fff;
      box-shadow: 0 0 0 1px var(--el-color-primary) !important;
    }
  }
}

.speaker-name-input {
  width: 140px;
  :deep(.el-input__inner) {
    font-size: 14px;
    font-weight: 600;
    color: #1f2329;
  }
}

.content-textarea {
  :deep(.el-textarea__inner) {
    font-size: 15px;
    line-height: 1.6;
    color: #1f2329;
    resize: none;
  }
}

.render-content {
  white-space: pre-wrap;
  word-break: break-all;
  cursor: text;
  min-height: 24px;
}

:deep(.keyword-highlight) {
  background-color: rgba(51, 126, 204, 0.15);
  color: #337ecc;
  font-weight: 600;
  padding: 0 4px;
  margin: 0 2px;
  border-radius: 4px;
  transition: all 0.2s;
  &:hover { background-color: rgba(51, 126, 204, 0.25); }
}

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
  &:hover { background-color: rgba(245, 108, 108, 0.25); }
}
</style>