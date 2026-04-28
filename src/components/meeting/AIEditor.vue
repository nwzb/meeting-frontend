<template>
  <div class="ai-editor">
    <div class="editor-toolbar" v-if="!isArchived">
      <el-button link type="primary" icon="Check" @click="handleManualSave">手动保存当前纪要</el-button>
    </div>

    <div
        v-if="!isEditing"
        class="render-content editor-preview"
        v-html="formatHighlight(content, highlightKeywords, sensitiveKeywords)"
        @click="startEdit"
    ></div>

    <el-input
        v-else
        type="textarea"
        v-model="content"
        :rows="12"
        class="editor-textarea"
        @blur="handleAutoSaveAndBlur"
        placeholder="此处可以编辑 AI 生成的全文摘要..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { meetingApi } from '@/api/meeting';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  modelValue: string;
  meetingId: string | number;
  highlightKeywords?: string[];
  sensitiveKeywords?: string[]; // ★ 新增：接收敏感词
  isArchived?: boolean;
  isAuditor: boolean;
}>();
const emit = defineEmits(['update:modelValue']);

const content = ref(props.modelValue);
const saving = ref(false);
const isEditing = ref(false);

watch(() => props.modelValue, (val) => {
  content.value = val;
});

const startEdit = () => {
  if (props.isArchived) {
    const msg = props.isAuditor ? '审计只读模式，无法修改' : '该会议已归档，无法修改';
    ElMessage.warning(msg);
    return; // ★ 核心修复：直接阻断
  }

  isEditing.value = true;
  nextTick(() => {
    const inputEl = document.querySelector('.editor-textarea textarea') as HTMLTextAreaElement;
    if (inputEl) inputEl.focus();
  });
};

const handleAutoSaveAndBlur = async () => {
  isEditing.value = false;
  if (content.value === props.modelValue) return;

  saving.value = true;
  try {
    await meetingApi.updateSummary(props.meetingId, content.value);
    emit('update:modelValue', content.value);
  } catch (err) {
    console.error('摘要自动保存失败:', err);
  } finally {
    setTimeout(() => { saving.value = false; }, 500);
  }
};

const handleManualSave = () => {
  isEditing.value = false;
  handleAutoSaveAndBlur();
  ElMessage.success('保存成功');
};

// ★ 核心高亮引擎：修复 TS 隐式 any 并加入红蓝双轨
const formatHighlight = (text: string, keywords?: string[], sensitiveWords?: string[]) => {
  if (!text) return '<span style="color: #999">暂无内容</span>';
  let resultText = text;

  const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 第一步：优先匹配敏感词并红色高亮 (修复 k 的类型为 string)
  if (sensitiveWords && sensitiveWords.length > 0) {
    const validSensitive = sensitiveWords.filter((k: string) => k.trim());
    if (validSensitive.length > 0) {
      const pattern = validSensitive.map(escapeRegExp).join('|');
      const regex = new RegExp(`(${pattern})`, 'gi');
      resultText = resultText.replace(regex, '<span class="sensitive-highlight">$1</span>');
    }
  }

  // 第二步：匹配普通 AI 关键词并蓝色高亮
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
/* === 预览态渲染层样式 === */
.render-content {
  white-space: pre-wrap;
  word-break: break-all;
  cursor: text;
  min-height: 24px;
}

/* AgendaList 特殊微调 */
.summary-render {
  font-size: 13px;
  color: #4e5969;
  line-height: 1.5;
}

/* AIEditor 特殊微调 */
.editor-preview {
  font-size: 14px;
  line-height: 1.6;
  color: #1f2329;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background-color: #f5f6f7;
  }
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
  text-decoration: line-through; /* 划线暗示违规 */
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