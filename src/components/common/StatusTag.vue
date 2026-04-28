<template>
  <el-tag :type="statusConfig.type" :class="['status-tag', { 'is-processing': isProcessing }]" effect="light">
    <span v-if="isProcessing" class="dot-inner"></span>
    {{ statusConfig.label }}
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: number | undefined;
}>();

/**
 * 状态映射配置
 * 1: 排队中, 2: 识别中, 3: 总结中, 4: 已完成, 9: 失败
 */
const statusConfig = computed(() => {
  const map: Record<number, { label: string; type: 'info' | 'primary' | 'warning' | 'success' | 'danger' }> = {
    1: { label: '排队中', type: 'info' },
    2: { label: '识别中', type: 'primary' },
    3: { label: '总结中', type: 'warning' },
    4: { label: '已完成', type: 'success' },
    9: { label: '生成失败', type: 'danger' },
  };
  return map[props.status ?? 1] || { label: '未知状态', type: 'info' };
});

// 判断是否需要呼吸灯效果 (识别中和总结中)
const isProcessing = computed(() => props.status === 2 || props.status === 3);
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  border: none;

  &.is-processing {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }

  // 呼吸灯圆点
  .dot-inner {
    width: 6px;
    height: 6px;
    background-color: currentColor;
    border-radius: 50%;
    animation: breathe 1.5s infinite ease-in-out;
  }
}

@keyframes breathe {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>