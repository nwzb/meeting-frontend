<template>
  <div class="rich-text-container" v-loading="loading">
    <div class="editor-header">
      <div class="header-left">
        <el-select
            v-model="formData.collectionId"
            placeholder="选择分类"
            class="folder-select"
            size="large"
        >
          <el-option label="默认分类" :value="null" />
          <el-option
              v-for="col in collections"
              :key="col.collectionId"
              :label="col.collectionName"
              :value="col.collectionId"
          />
        </el-select>
        <el-input
            v-model="formData.title"
            placeholder="请输入笔记标题"
            class="title-input"
            maxlength="100"
        />
      </div>

      <div class="header-actions">
        <el-switch
            v-model="formData.isTop"
            :active-value="1"
            :inactive-value="0"
            active-text="置顶"
            style="margin-right: 20px;"
        />

        <ExportMenu
            v-if="formData.id"
            buttonText="导出笔记"
            buttonType="success"
            icon="Download"
            @export="handleExport"
            style="margin: 0 12px;"
        />
        <el-button type="danger" plain @click="handleDelete" v-if="formData.id">删除</el-button>
        <el-button type="primary" @click="handleSave">保存笔记</el-button>
      </div>
    </div>

    <div class="editor-body">
      <Toolbar class="editor-toolbar" :editor="editorRef" :defaultConfig="toolbarConfig" mode="default" />
      <Editor class="editor-content" v-model="formData.content" :defaultConfig="editorConfig" mode="default" @onCreated="handleCreated" />
    </div>
  </div>
</template>

<script setup lang="ts">
import '@wangeditor/editor/dist/css/style.css'
import { onBeforeUnmount, ref, shallowRef, watch, reactive } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import { getNoteDetail, addNote, updateNote, deleteNote } from '@/api/note'
import type { Note, NoteTreeItem } from '@/types/note'

// 【新增】：引入导出组件和工具方法
import ExportMenu from '@/components/common/ExportMenu.vue'
import { exportNoteTextFile, exportNoteWordFile, exportNotePdfFile, type NoteExportData } from '@/utils/exportUtils'

const props = defineProps<{
  noteId: number | null;
  collectionId: number | null;
  collections: NoteTreeItem[];
}>()

const emit = defineEmits(['saved', 'deleted'])
const editorRef = shallowRef()
const loading = ref(false)

const formData = reactive<Note>({
  id: undefined,
  collectionId: null,
  title: '',
  content: '',
  isTop: 0
})

const toolbarConfig = { excludeKeys: ['fullScreen'] }
const editorConfig = { placeholder: '从这里开始记录你的灵感...' }

onBeforeUnmount(() => {
  if (editorRef.value) editorRef.value.destroy()
})

const handleCreated = (editor: any) => { editorRef.value = editor }

watch(() => props.noteId, async (newVal) => {
  if (newVal) {
    loading.value = true
    try {
      const res = await getNoteDetail(newVal)
      if (res.data) {
        Object.assign(formData, res.data)
        if (formData.collectionId === 0) formData.collectionId = null
      }
    } catch (error) {
      ElMessage.error('加载详情失败')
    } finally {
      loading.value = false
    }
  } else {
    formData.id = undefined
    formData.title = ''
    formData.content = ''
    formData.isTop = 0
    formData.collectionId = props.collectionId === 0 ? null : props.collectionId
  }
}, { immediate: true })

const handleSave = async () => {
  if (!formData.title.trim()) {
    ElMessage.warning('标题不能为空')
    return
  }
  loading.value = true
  try {
    if (formData.id) await updateNote(formData)
    else await addNote(formData)
    ElMessage.success('保存成功')
    emit('saved')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    loading.value = false
  }
}

const handleDelete = () => {
  ElMessageBox.confirm('确定要删除这篇笔记吗？', '警告', { type: 'warning' }).then(async () => {
    await deleteNote(formData.id!)
    ElMessage.success('删除成功')
    emit('deleted')
  }).catch(() => {})
}

// 【新增】：导出核心处理逻辑
const handleExport = async (format: string) => {
  if (!formData.title.trim() || !editorRef.value) {
    return ElMessage.warning('笔记内容尚未准备好');
  }

  // 组装笔记专属导出数据
  const exportData: NoteExportData = {
    title: formData.title,
    contentHtml: editorRef.value.getHtml(), // 获取带标签的HTML用于PDF排版
    contentText: editorRef.value.getText()  // 获取纯文本用于TXT/Word
  };

  const fileName = formData.title || '无标题笔记';

  try {
    if (format === 'txt' || format === 'md') {
      exportNoteTextFile(exportData, fileName, format);
      ElMessage.success(`${format.toUpperCase()} 导出成功`);

    } else if (format === 'docx') {
      const loadingInstance = ElLoading.service({ text: '正在生成 Word 文档...' });
      await exportNoteWordFile(exportData, fileName);
      loadingInstance.close();
      ElMessage.success('Word 导出成功');

    } else if (format === 'pdf') {
      const loadingInstance = ElLoading.service({ text: '正在渲染 PDF...' });
      setTimeout(() => {
        exportNotePdfFile(exportData, fileName);
        loadingInstance.close();
        ElMessage.success('PDF 导出成功');
      }, 100);
    }
  } catch (error) {
    console.error('笔记导出失败:', error);
    ElMessage.error('文件生成失败');
  }
}
</script>

<style scoped>
.rich-text-container { height: 100%; display: flex; flex-direction: column; background-color: #fff; }
.editor-header { padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e4e7ed; }
.header-left { display: flex; align-items: center; flex: 1; }
.folder-select { width: 140px; margin-right: 16px; }
.folder-select :deep(.el-input__wrapper) { border-radius: 8px; background-color: #f7f8fa; box-shadow: none; }
.title-input { flex: 1; }
.title-input :deep(.el-input__wrapper) { box-shadow: none !important; background-color: transparent; }
.title-input :deep(.el-input__inner) { font-size: 22px; font-weight: 600; color: #1f2329; }
.header-actions { display: flex; align-items: center; }
.editor-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.editor-toolbar { border-bottom: 1px solid #e4e7ed; }
.editor-content { flex: 1; overflow-y: hidden; padding: 0 20px; }
</style>