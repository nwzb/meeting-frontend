<template>
  <div class="todo-tree-node">
    <div class="todo-item-card" :class="{ 'is-completed': todo.status === 1 }">
      <div class="todo-main">
        <el-icon class="drag-handle"><Rank /></el-icon>

        <el-icon
            class="expand-icon"
            :class="{ 'is-expanded': isExpanded, 'is-hidden': !hasChildren && !appStore.isTodoDraggingActive }"
            @click.stop="toggleExpand"
        >
          <CaretRight />
        </el-icon>

        <el-checkbox v-model="isCompleted" @change="handleStatusChange" class="todo-checkbox" @click.stop/>

        <div class="todo-content" @click="emit('edit', todo)">
          <div class="todo-title">{{ todo.title }}</div>

          <div class="todo-meta" v-if="todo.deadline || todo.sourceMeetingId || (todo.remindType && todo.remindType > 0)">
            <el-tag v-if="todo.deadline" size="small" :type="isOverdue ? 'danger' : 'info'" class="meta-tag">
              <el-icon><Calendar /></el-icon>
              <span class="tag-text">{{ formatTime(todo.deadline) }}</span>
              <span v-if="isOverdue" class="overdue-text">(过期)</span>
            </el-tag>

            <el-tooltip
                v-if="todo.remindType && todo.remindType > 0"
                effect="dark"
                :content="getRemindDesc(todo)"
                placement="top"
            >
              <el-tag size="small" type="primary" class="meta-tag remind-active">
                <el-icon><Bell /></el-icon>
                <span class="tag-text">{{ formatShortTime(todo.remindTime) }}</span>
              </el-tag>
            </el-tooltip>

            <el-tag v-if="todo.sourceMeetingId" size="small" type="success" class="meta-tag">
              <el-icon><Mic /></el-icon>
              <span class="tag-text">{{ todo.sourceMeetingTitle || '源自会议' }}</span>
            </el-tag>
          </div>
        </div>

        <div class="todo-actions">
          <el-button type="primary" link :icon="Plus" @click.stop="emit('add-sub', todo)">
            子待办
          </el-button>
          <el-button type="danger" link :icon="Delete" @click.stop="emit('delete', todo.id)">
            删除
          </el-button>
        </div>
      </div>
    </div>

    <div
        class="sub-todos"
        :class="{ 'is-dragging-mode': appStore.isTodoDraggingActive && isExpanded }"
        v-show="isExpanded"
    >
      <draggable
          v-if="todo.children"
          :list="todo.children"
          group="todos"
          item-key="id"
          handle=".drag-handle"
          ghost-class="ghost"
          class="sub-drag-area"
          :animation="150"
          @start="handleGlobalDragStart"
          @end="handleGlobalDragEnd"
      >
        <template #item="{ element }">
          <TodoItem
              :todo="element"
              @status-change="emit('status-change', $event)"
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
import { ref, watch, computed } from 'vue';
import draggable from 'vuedraggable';
import type { TodoVO } from '@/types/todo';
import { useAppStore } from '@/store/app';
import { Calendar, Mic, Delete, CaretRight, Plus, Rank, Bell } from '@element-plus/icons-vue';

const props = defineProps<{ todo: TodoVO }>();
const emit = defineEmits(['status-change', 'edit', 'delete', 'add-sub', 'drag-end']);

const isCompleted = ref(props.todo.status === 1);
const isExpanded = ref(true);
const appStore = useAppStore();

const hasChildren = computed(() => props.todo.children && props.todo.children.length > 0);
const toggleExpand = () => { isExpanded.value = !isExpanded.value; };

watch(() => props.todo.status, (newVal) => isCompleted.value = newVal === 1);

const handleStatusChange = (val: string | number | boolean) => {
  emit('status-change', { ...props.todo, status: val ? 1 : 0 });
};

const handleGlobalDragStart = () => {
  appStore.isTodoDraggingActive = true;
};

const handleGlobalDragEnd = () => {
  appStore.isTodoDraggingActive = false;
  emit('drag-end');
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  return timeStr.replace('T', ' ').substring(0, 16);
};

const formatShortTime = (timeStr?: string) => {
  if (!timeStr) return '';
  return timeStr.replace('T', ' ').substring(5, 16);
};

const getRemindDesc = (todo: TodoVO) => {
  const types = ['', '单次提醒', '每天提醒', '每周提醒', '每月提醒'];
  return `${types[todo.remindType || 0]}：${formatTime(todo.remindTime || '')}`;
};

const isOverdue = computed(() => {
  if (!props.todo.deadline || props.todo.status === 1) return false;
  return new Date(props.todo.deadline.replace('T', ' ')).getTime() < new Date().getTime();
});
</script>

<style scoped lang="scss">
.meta-tag {
  height: auto !important;
  min-height: 26px;
  padding: 4px 8px !important;
  line-height: 1.4 !important;
  border-radius: 6px !important;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: normal;
  margin-top: 6px;

  .tag-text { font-size: 12px; }
  .overdue-text { font-weight: bold; margin-left: 2px; }
}

.remind-active {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.drag-handle { cursor: grab; color: var(--el-text-color-placeholder); font-size: 18px; margin-top: 2px; &:hover { color: var(--el-color-primary); } &:active { cursor: grabbing; } }
.ghost { opacity: 0.4; background: var(--el-color-primary-light-9); }

.todo-tree-node { margin-bottom: 8px; }
.todo-item-card { background: var(--el-bg-color-overlay); border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 10px 12px; transition: all 0.3s ease; }
.todo-item-card:hover .todo-actions { opacity: 1; }
.todo-item-card.is-completed { opacity: 0.6; .todo-title { text-decoration: line-through; color: var(--el-text-color-secondary); } }
.todo-main { display: flex; align-items: flex-start; gap: 8px; }
.expand-icon { margin-top: 4px; cursor: pointer; transition: transform 0.3s; color: var(--el-text-color-secondary); &.is-expanded { transform: rotate(90deg); } }
.expand-icon.is-hidden { opacity: 0; pointer-events: none; }
.todo-checkbox { margin-top: 2px; }
.todo-content { flex: 1; cursor: pointer; }
.todo-title { font-size: 14px; color: var(--el-text-color-primary); line-height: 1.4; }
.todo-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.todo-actions { opacity: 0.3; transition: opacity 0.2s; display: flex; gap: 4px; margin-top: 2px; }

.sub-todos {
  padding-left: 20px;
  margin-left: 24px;
}

.sub-drag-area {
  min-height: 0;
  transition: all 0.2s;
  margin: 0 !important;
  position: relative;
  z-index: 1;
}

.sub-drag-area:not(:empty) { margin-top: 8px !important; }
.sub-drag-area:empty { border: none; background-color: transparent; }
.sub-drag-area:empty::after { content: ''; }

.is-dragging-mode .sub-drag-area { min-height: 42px; margin: 0 !important; }

.is-dragging-mode .sub-drag-area:not(:empty) {
  padding-top: 8px;
  padding-bottom: 8px;
  border-left: 1px dashed var(--el-border-color-lighter);
}

/* ★ 核心修改：强化拖拽时的空占位靶心 ★ */
.is-dragging-mode .sub-drag-area:empty {
  margin-top: 8px !important;
  margin-bottom: 8px !important;
  border: 2px dashed #c0c4cc; /* 加粗虚线 */
  border-radius: 8px;
  background-color: #ffffff; /* 实体白底 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); /* 增加微投影 */
}

.is-dragging-mode .sub-drag-area:empty::after {
  content: '拖拽至此添加子待办';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px; /* 还原较小字号 */
  font-weight: normal; /* 取消加粗 */
  color: var(--el-text-color-placeholder); /* 还原为浅灰色的占位符颜色 */
  pointer-events: none;
  white-space: nowrap;
}
</style>