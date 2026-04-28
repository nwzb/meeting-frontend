<template>
  <div class="quadrant-board">
    <div class="board-header" :class="`theme-${quadrantType}`">
      <div class="header-title">
        <span class="dot"></span>
        <h3>{{ title }}</h3>
        <span class="count">{{ modelValue.length }}</span>
      </div>
      <el-button type="primary" link icon="Plus" @click="emit('add', quadrantType)">新建</el-button>
    </div>

    <div class="board-content scrollbar">
      <div class="empty-placeholder" v-if="modelValue.length === 0">
        <el-empty description="拖拽至此" :image-size="50" />
      </div>

      <draggable
          :list="modelValue"
          group="todos"
          item-key="id"
          handle=".drag-handle"
          ghost-class="ghost"
          class="drag-area"
          :animation="200"
          @start="handleGlobalDragStart"
          @end="handleGlobalDragEnd"
      >
        <template #item="{ element }">
          <TodoItem
              :todo="element"
              @status-change="emit('update', $event)"
              @edit="emit('edit', $event)"
              @delete="emit('delete', $event)"
              @add-sub="emit('add-sub', $event)"
          />
        </template>
      </draggable>
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable';
import TodoItem from './TodoItem.vue';
import type { TodoVO } from '@/types/todo';
import { useAppStore } from '@/store/app'; // ★ 引入 AppStore

// Props/Emits 限定保持原样
defineProps<{ title: string; quadrantType: number; modelValue: TodoVO[]; }>();
const emit = defineEmits(['update:modelValue', 'add', 'update', 'edit', 'delete', 'add-sub', 'drag-end']);

const appStore = useAppStore(); // ★ 初始化 Store

// ★ 新增：顶级列表上报拖拽激活状态 ★
const handleGlobalDragStart = () => {
  appStore.isTodoDraggingActive = true;
};

const handleGlobalDragEnd = () => {
  appStore.isTodoDraggingActive = false;
  // ★ 同时触发表单同步逻辑 ★
  emit('drag-end');
};
</script>

<style scoped lang="scss">
.quadrant-board { height: 100%; display: flex; flex-direction: column; background: var(--el-bg-color-page); border-radius: 12px; }
.board-header { padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--el-border-color-light); }
.header-title { display: flex; align-items: center; gap: 8px; .dot { width: 8px; height: 8px; border-radius: 50%; } h3 { margin: 0; font-size: 16px; font-weight: bold;} .count { background: var(--el-fill-color); padding: 2px 8px; border-radius: 10px; font-size: 12px; } }
.board-header.theme-1 .dot { background-color: var(--el-color-danger); }
.board-header.theme-2 .dot { background-color: var(--el-color-warning); }
.board-header.theme-3 .dot { background-color: var(--el-color-primary); }
.board-header.theme-4 .dot { background-color: var(--el-color-info); }

.board-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 解决①：占满父级剩余空间 */
.drag-area {
  flex: 1;
  min-height: 100px;
  z-index: 2; /* 盖在 empty 之上 */
}

.empty-placeholder {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none; /* 穿透点击，不影响接收拖拽 */
  z-index: 1;
}
</style>
