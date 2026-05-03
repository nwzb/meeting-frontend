<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button :type="buttonType" plain :icon="icon">
      {{ buttonText }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="txt" icon="Document">导出为纯文本 (.txt)</el-dropdown-item>
        <el-dropdown-item command="md" icon="Notebook">导出为 Markdown (.md)</el-dropdown-item>
        <el-dropdown-item command="docx" icon="Files" divided>导出为 Word (.docx)</el-dropdown-item>
        <el-dropdown-item command="pdf" icon="Checked">导出为 PDF (.pdf)</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
// 纯净的 UI 组件，不引入任何业务 Store
withDefaults(defineProps<{
  buttonText?: string;
  buttonType?: 'primary' | 'success' | 'warning' | 'info' | 'default';
  icon?: string;
}>(), {
  buttonText: '导出',
  buttonType: 'primary',
  icon: 'Download'
});

const emit = defineEmits<{
  (e: 'export', format: string): void;
}>();

const handleCommand = (format: string) => {
  // 仅将用户选择的格式暴露给父组件去处理
  emit('export', format);
};
</script>

<style scoped>
.el-icon--right {
  margin-left: 8px;
}
</style>