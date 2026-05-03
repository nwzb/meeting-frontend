<template>
  <el-container class="note-layout">
    <el-aside width="280px">
      <NoteFolder
          ref="folderRef"
          @select-note="handleSelectNote"
          @create-collection="showCollectionDialog = true"
          @create-note="handleCreateNote"
          @update:collections="collections = $event"
      />
    </el-aside>

    <el-main class="editor-main">
      <div v-if="currentNoteId !== null || isCreating" class="editor-wrapper">
        <RichTextEditor
            :key="editorKey"
            :noteId="currentNoteId"
            :collectionId="currentCollectionId"
            :collections="collections"
            @saved="handleEditorSuccess"
            @deleted="handleEditorDelete"
        />
      </div>

      <div v-else class="empty-state">
        <el-empty description="选择一篇笔记，或在左侧点击新建笔记" />
      </div>
    </el-main>

    <el-dialog v-model="showCollectionDialog" title="新建分类目录" width="400px">
      <el-form :model="collectionForm" label-width="80px" @submit.prevent>
        <el-form-item label="分类名称" required>
          <el-input v-model="collectionForm.name" placeholder="请输入分类名称" maxlength="20" @keyup.enter="submitCollection"/>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="collectionForm.sortOrder" :min="0" :max="99" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showCollectionDialog = false">取消</el-button>
          <el-button type="primary" @click="submitCollection">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import NoteFolder from '@/components/note/NoteFolder.vue'
import RichTextEditor from '@/components/note/RichTextEditor.vue'
import { addCollection } from '@/api/note'
import type { NoteTreeItem } from '@/types/note'

const folderRef = ref()
const currentNoteId = ref<number | null>(null)
const currentCollectionId = ref<number | null>(null)
const isCreating = ref(false)
const collections = ref<NoteTreeItem[]>([]) // 传递给编辑器的分类数据

// 核心改动：用于强制刷新富文本组件的 key
const editorKey = ref(0)

const showCollectionDialog = ref(false)
const collectionForm = reactive({ name: '', sortOrder: 0 })

const handleSelectNote = (noteId: number) => {
  currentNoteId.value = noteId
  isCreating.value = false
}

const handleCreateNote = () => {
  currentNoteId.value = null
  isCreating.value = true
  // 每次点击新建时，也重置一下输入框，防止残留上一次未保存的内容
  editorKey.value++
}

// 核心改动：区分新建和更新的保存逻辑
const handleEditorSuccess = () => {
  if (folderRef.value) folderRef.value.fetchTreeData()

  if (isCreating.value) {
    // 新建逻辑：强反馈 + 强制清空
    ElMessageBox.alert('新建笔记已成功保存！', '成功', {
      confirmButtonText: '确定',
      type: 'success',
      callback: () => {
        // 重置为刚点击新建笔记的状态
        editorKey.value++ // 强制销毁并重建 RichTextEditor，从而清空里面的内容
        currentNoteId.value = null
        isCreating.value = true
      }
    })
  } else {
    // 更新逻辑：弱反馈，不打断用户操作
    ElMessage.success('笔记已更新')
  }
}

const handleEditorDelete = () => {
  currentNoteId.value = null
  isCreating.value = false
  if (folderRef.value) folderRef.value.fetchTreeData()
}

const submitCollection = async () => {
  if (!collectionForm.name.trim()) return ElMessage.warning('请输入分类名称')
  try {
    await addCollection({ name: collectionForm.name, sortOrder: collectionForm.sortOrder })
    ElMessage.success('创建成功')
    showCollectionDialog.value = false
    collectionForm.name = ''
    if (folderRef.value) folderRef.value.fetchTreeData()
  } catch (error) {}
}
</script>

<style scoped>
.note-layout { height: calc(100vh - 100px); background-color: #fff; }
.editor-main { padding: 0; display: flex; flex-direction: column; }
.editor-wrapper { flex: 1; height: 100%; }
.empty-state { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; }
</style>