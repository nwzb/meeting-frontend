<template>
  <div class="todo-page">
    <div class="page-header">
      <h2>待办工作台</h2>
      <div class="header-actions">
        <el-radio-group v-model="viewMode" size="default" style="margin-right: 15px;">
          <el-radio-button label="grid"><el-icon><Grid /></el-icon> 四象限</el-radio-button>
          <el-radio-button label="list"><el-icon><Tickets /></el-icon> 列表</el-radio-button>
        </el-radio-group>
        <el-button type="primary" icon="Plus" @click="openDialog()">新建待办</el-button>
      </div>
    </div>

    <div class="quadrant-container" :class="`is-${viewMode}`">
      <QuadrantBoard title="重要且紧急" :quadrantType="1" v-model="q1List" @add="openDialog" @update="handleUpdate" @edit="openDialog" @delete="handleDelete" @add-sub="handleAddSub" @drag-end="handleTreeChange"/>
      <QuadrantBoard title="重要不紧急" :quadrantType="2" v-model="q2List" @add="openDialog" @update="handleUpdate" @edit="openDialog" @delete="handleDelete" @add-sub="handleAddSub" @drag-end="handleTreeChange"/>
      <QuadrantBoard title="紧急不重要" :quadrantType="3" v-model="q3List" @add="openDialog" @update="handleUpdate" @edit="openDialog" @delete="handleDelete" @add-sub="handleAddSub" @drag-end="handleTreeChange"/>
      <QuadrantBoard title="不重要不紧急" :quadrantType="4" v-model="q4List" @add="openDialog" @update="handleUpdate" @edit="openDialog" @delete="handleDelete" @add-sub="handleAddSub" @drag-end="handleTreeChange"/>
    </div>

    <el-dialog :title="dialogForm.id ? '编辑待办' : (dialogForm.parentId ? '新建子待办' : '新建待办')" v-model="dialogVisible" width="500px" destroy-on-close>
      <el-form :model="dialogForm" :rules="rules" ref="formRef" label-width="90px">

        <el-form-item label="父级待办" v-if="dialogForm.parentId !== 0 && !dialogForm.id">
          <el-tag type="info" class="w-full">{{ parentTitleTip }}</el-tag>
        </el-form-item>

        <el-form-item label="待办内容" prop="title">
          <el-input v-model="dialogForm.title" type="textarea" :rows="3" placeholder="请输入待办事项内容..." />
        </el-form-item>

        <el-form-item label="所属象限" prop="priorityQuadrant">
          <el-select v-model="dialogForm.priorityQuadrant" class="w-full" :disabled="dialogForm.parentId !== 0">
            <el-option label="重要且紧急" :value="1" />
            <el-option label="重要不紧急" :value="2" />
            <el-option label="紧急不重要" :value="3" />
            <el-option label="不重要不紧急" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item label="截止时间" prop="deadline">
          <el-date-picker v-model="dialogForm.deadline" type="datetime" placeholder="选择截止日期时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%;" />
        </el-form-item>

        <el-form-item label="提醒设置">
          <div style="display: flex; gap: 10px; width: 100%;">
            <el-select v-model="dialogForm.remindType" placeholder="提醒频率" style="width: 120px">
              <el-option label="不提醒" :value="0" />
              <el-option label="仅一次" :value="1" />
              <el-option label="每天" :value="2" />
              <el-option label="每周" :value="3" />
              <el-option label="每月" :value="4" />
            </el-select>

            <el-date-picker
                v-if="dialogForm.remindType && dialogForm.remindType > 0"
                v-model="dialogForm.remindTime"
                type="datetime"
                placeholder="提醒时间"
                format="YYYY-MM-DD HH:mm"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="flex: 1;"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { ElMessage, ElMessageBox, ElForm } from 'element-plus';
import QuadrantBoard from '@/components/todo/QuadrantBoard.vue';
import { getTodoList, addTodo, updateTodo, deleteTodo, batchUpdateTodos } from '@/api/todo';
import type { TodoVO, TodoDTO } from '@/types/todo';
import { Grid, Tickets } from '@element-plus/icons-vue';

const viewMode = ref('grid');

const q1List = ref<TodoVO[]>([]);
const q2List = ref<TodoVO[]>([]);
const q3List = ref<TodoVO[]>([]);
const q4List = ref<TodoVO[]>([]);

const fetchTodos = async () => {
  try {
    const res = await getTodoList();
    const all = res.data || [];
    q1List.value = all.filter((t: TodoVO) => t.priorityQuadrant === 1);
    q2List.value = all.filter((t: TodoVO) => t.priorityQuadrant === 2);
    q3List.value = all.filter((t: TodoVO) => t.priorityQuadrant === 3);
    q4List.value = all.filter((t: TodoVO) => t.priorityQuadrant === 4);
  } catch (error) {
    console.error('获取待办失败', error);
  }
};

onMounted(() => fetchTodos());

const handleTreeChange = async () => {
  const syncPayload: TodoDTO[] = [];
  const traverse = (list: TodoVO[], quadrant: number, parentId: number) => {
    list.forEach((item, index) => {
      syncPayload.push({
        id: item.id,
        title: item.title,
        priorityQuadrant: quadrant,
        parentId: parentId,
        sortOrder: index,
        remindType: item.remindType ?? 0,
        remindTime: item.remindTime,
        sourceMeetingId: item.sourceMeetingId
      });
      if (item.children && item.children.length > 0) traverse(item.children, quadrant, item.id);
    });
  };
  traverse(q1List.value, 1, 0); traverse(q2List.value, 2, 0); traverse(q3List.value, 3, 0); traverse(q4List.value, 4, 0);
  try {
    await batchUpdateTodos(syncPayload);
  } catch (error) {
    ElMessage.error('拖拽同步失败，请刷新页面');
    fetchTodos();
  }
};

const handleUpdate = async (updatedItem: TodoVO) => {
  try {
    const dto: TodoDTO = {
      ...updatedItem,
      remindType: updatedItem.remindType ?? 0
    };
    await updateTodo(dto);
    await fetchTodos();
  } catch (e) {
    ElMessage.error('更新失败');
  }
};

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要删除该待办及其所有子待办吗？', '删除确认', { type: 'warning' }).then(async () => {
    await deleteTodo(id); ElMessage.success('删除成功'); fetchTodos();
  }).catch(() => {});
};

const dialogVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref<InstanceType<typeof ElForm>>();
const parentTitleTip = ref('');

const dialogForm = reactive<TodoDTO>({
  title: '',
  priorityQuadrant: 4,
  parentId: 0,
  remindType: 0,
  remindTime: undefined,
  deadline: undefined,
  sourceMeetingId: undefined,
  sortOrder: 0
});

const rules = { title: [{ required: true, message: '待办内容不能为空', trigger: 'blur' }] };

const openDialog = (payload?: number | TodoVO) => {
  Object.assign(dialogForm, {
    id: undefined,
    title: '',
    priorityQuadrant: typeof payload === 'number' ? payload : 4,
    parentId: 0,
    remindType: 0,
    remindTime: undefined,
    deadline: undefined,
    sourceMeetingId: undefined,
    sortOrder: 0
  });
  parentTitleTip.value = '';

  if (payload && typeof payload === 'object') {
    dialogForm.id = payload.id;
    dialogForm.title = payload.title;
    dialogForm.priorityQuadrant = payload.priorityQuadrant;
    dialogForm.deadline = payload.deadline;
    dialogForm.remindType = payload.remindType || 0;
    dialogForm.remindTime = payload.remindTime;
    dialogForm.parentId = payload.parentId;
    dialogForm.sourceMeetingId = payload.sourceMeetingId;
    dialogForm.sortOrder = payload.sortOrder;
  }
  dialogVisible.value = true;
};

const handleAddSub = (parentTodo: TodoVO) => {
  openDialog();
  dialogForm.parentId = parentTodo.id;
  dialogForm.priorityQuadrant = parentTodo.priorityQuadrant;
  parentTitleTip.value = parentTodo.title;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      if (dialogForm.remindType > 0 && !dialogForm.remindTime) {
        ElMessage.warning('设置了提醒方式，必须选择具体提醒时间');
        return;
      }
      submitLoading.value = true;
      try {
        if (dialogForm.id) {
          await updateTodo(dialogForm);
          ElMessage.success('更新成功');
        } else {
          await addTodo(dialogForm);
          ElMessage.success('添加成功');
        }
        dialogVisible.value = false;
        fetchTodos();
      } finally {
        submitLoading.value = false;
      }
    }
  });
};
</script>

<style scoped lang="scss">
.todo-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 20px 20px 20px;
  box-sizing: border-box;

  /* ★ 核心修改 1：最外层改为透明，让顶部的标题和按钮融入全局环境光 */
  background: transparent;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* 增加底部间距，让标题区域和下方的白板隔开一段距离 */
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-actions { display: flex; align-items: center; }

.quadrant-container {
  flex: 1;
  transition: all 0.3s;

  /* ★ 核心修改 2：把原本的纯白背景和圆角转移到这里，变成一个独立的下层工作台 */
  background-color: #ffffff;
  border-radius: 12px;
  padding: 20px; /* 给内部象限留出呼吸空间 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02); /* 微微的投影提升立体感 */
}

.quadrant-container.is-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 20px;
  min-height: 0;
}

.quadrant-container.is-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
  padding-right: 10px;
}
.quadrant-container.is-list :deep(.quadrant-board) {
  height: auto;
  min-height: 120px;
  flex-shrink: 0;
}
.quadrant-container.is-list :deep(.drag-area) {
  min-height: 60px;
}
.w-full { width: 100%; }

/* =========================================
   深度优化子组件 TodoItem 的样式
   ========================================= */

.quadrant-container :deep(.el-card),
.quadrant-container :deep(.todo-item) {
  margin-bottom: 8px !important;
}

.quadrant-container :deep(.drag-area) {
  gap: 8px !important;
}

.quadrant-container :deep(.el-tag) {
  height: auto !important;
  min-height: 26px;
  padding: 4px 8px !important;
  line-height: 1.4 !important;
  border-radius: 6px !important;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 4px;
}

.quadrant-container :deep(.el-tag .el-icon) {
  margin-right: 4px;
}
</style>