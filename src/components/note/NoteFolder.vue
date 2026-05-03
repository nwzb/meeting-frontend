<template>
  <div class="note-folder">
    <div class="top-action">
      <el-button type="primary" class="new-note-btn" @click="handleCreateNote">
        <el-icon style="margin-right: 4px"><EditPen /></el-icon> 新建笔记
      </el-button>
    </div>

    <div class="folder-header">
      <span class="title">分类目录</span>
      <el-button type="primary" link @click="$emit('create-collection')">
        <el-icon><Plus /></el-icon> 新建
      </el-button>
    </div>

    <!-- 可拖拽树形组件 -->
    <div class="tree-container" v-loading="treeLoading">
      <el-tree
          ref="treeRef"
          :data="treeNodes"
          node-key="uniqueId"
          draggable
          :allow-drop="allowDrop"
          @node-drop="handleDrop"
          @node-click="handleNodeClick"
          :expand-on-click-node="false"
          default-expand-all
          class="custom-tree"
      >
        <!-- 自定义节点内容 -->
        <template #default="{ data }">
          <div class="custom-tree-node" :class="{ 'is-active': data.type === 'note' && data.realId === currentActiveId }">
            <!-- 分类节点样式 -->
            <template v-if="data.type === 'collection'">
              <div class="node-left">
                <el-icon color="#8f959e" size="16"><FolderOpened /></el-icon>
                <span class="node-label font-bold">{{ data.label }}</span>
              </div>
              <el-icon v-if="data.realId !== 0" class="action-icon delete-btn" @click.stop="handleDeleteFolder(data.realId)">
                <Delete />
              </el-icon>
            </template>

            <!-- 笔记节点样式 -->
            <template v-else>
              <div class="node-left note-item">
                <el-icon color="#3370ff" size="16"><Document /></el-icon>
                <span class="node-label">{{ data.label }}</span>
                <el-tag v-if="data.raw.isTop === 1" size="small" type="danger" effect="plain" class="top-tag">顶</el-tag>
              </div>
            </template>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, FolderOpened, Document, EditPen, Delete } from '@element-plus/icons-vue'
import { getNoteTree, deleteCollection, updateCollection, updateNote } from '@/api/note'
import type { NoteTreeItem } from '@/types/note'
import { ElMessage, ElMessageBox } from 'element-plus'

const rawTreeData = ref<NoteTreeItem[]>([])
const treeLoading = ref(false)
const currentActiveId = ref<number | null>(null) // 记录当前选中的笔记变色

const emit = defineEmits(['select-note', 'create-collection', 'create-note', 'update:collections'])

// 1. 数据转换：把后端的树转化为 el-tree 需要的带类型标志的数据
const treeNodes = computed(() => {
  return rawTreeData.value.map(col => ({
    uniqueId: `col_${col.collectionId}`,
    realId: col.collectionId,
    type: 'collection',
    label: col.collectionName,
    raw: col,
    children: col.notes.map(n => ({
      uniqueId: `note_${n.id}`,
      realId: n.id,
      type: 'note',
      label: n.title || '无标题笔记',
      collectionId: n.collectionId,
      raw: n // 保留原始数据，拖拽保存时需要
    }))
  }))
})

// 2. 拖拽规则校验
const allowDrop = (draggingNode: any, dropNode: any, type: string) => {
  const dragData = draggingNode.data
  const dropData = dropNode.data

  if (dragData.type === 'collection') {
    // 规则：分类只能和分类平级拖拽（不能放进别人里面，也不能变成笔记的子集）
    return dropData.type === 'collection' && type !== 'inner'
  } else if (dragData.type === 'note') {
    // 规则：笔记可以拖入分类中，也可以在笔记之间排序
    if (dropData.type === 'collection' && type === 'inner') return true
    if (dropData.type === 'note' && type !== 'inner') return true
    return false
  }
  return false
}

// 3. 拖拽完成后的后台落库处理 (Debug 强化版)
const handleDrop = async (draggingNode: any, dropNode: any, dropType: string) => {
  const dragData = draggingNode.data
  const dropData = dropNode.data
  treeLoading.value = true

  console.log("=== 拖拽事件触发 ===")
  console.log("拖拽的节点:", dragData)
  console.log("落入的目标节点:", dropData)
  console.log("落入方式 (inner/before/after):", dropType)

  try {
    if (dragData.type === 'collection') {
      console.log("-> 正在处理分类排序...")
      const rootNodes = dropNode.parent.childNodes

      const promises = rootNodes.map((node: any, index: number) => {
        if(node.data.realId === 0) return Promise.resolve()
        const payload = {
          id: node.data.realId,
          name: node.data.label,
          sortOrder: index
        }
        console.log(`准备发送的分类更新 payload [${index}]:`, payload)
        return updateCollection(payload)
      })
      await Promise.all(promises)
      ElMessage.success('分类排序已保存')

    } else if (dragData.type === 'note') {
      console.log("-> 正在处理笔记移动/排序...")
      let newCollectionId = null

      if (dropType === 'inner' && dropData.type === 'collection') {
        newCollectionId = dropData.realId === 0 ? null : dropData.realId
      } else {
        newCollectionId = dropNode.parent.data.realId === 0 ? null : dropNode.parent.data.realId
      }
      console.log("计算出的新分类ID:", newCollectionId)

      let targetNotes = []
      if (dropType === 'inner' && dropData.type === 'collection') {
        targetNotes = dropNode.childNodes
      } else {
        targetNotes = dropNode.parent.childNodes
      }

      const promises = targetNotes.map((node: any, index: number) => {
        const noteData = { ...node.data.raw }
        if (node.data.realId === dragData.realId) {
          noteData.collectionId = newCollectionId
        }
        noteData.sortOrder = index
        console.log(`准备发送的笔记更新 payload [${index}]:`, noteData)
        return updateNote(noteData)
      })

      await Promise.all(promises)
      ElMessage.success('笔记排序/移动成功')
    }
  } catch (error) {
    console.error("❌ 捕捉到拖拽同步错误:", error)
    ElMessage.error('拖拽同步失败')
  } finally {
    await fetchTreeData()
  }
}

// 获取数据
const fetchTreeData = async () => {
  treeLoading.value = true
  try {
    const res = await getNoteTree()
    if (res.data) {
      rawTreeData.value = res.data
      // 将原数据抛给父组件，供编辑器下拉框使用
      emit('update:collections', res.data.filter(c => c.collectionId !== 0))
    }
  } catch (error) {
    ElMessage.error('获取列表失败')
  } finally {
    treeLoading.value = false
  }
}

// 点击节点 (点击分类展开折叠由 el-tree 自带，这里只处理点击笔记)
const handleNodeClick = (data: any) => {
  if (data.type === 'note') {
    currentActiveId.value = data.realId
    emit('select-note', data.realId)
  }
}

const handleCreateNote = () => {
  currentActiveId.value = null
  emit('create-note')
}

const handleDeleteFolder = (collectionId: number) => {
  ElMessageBox.confirm('删除该分类后，内部笔记将被移入默认分类，确定吗？', '提示').then(async () => {
    await deleteCollection(collectionId)
    ElMessage.success('删除成功')
    fetchTreeData()
  }).catch(() => {})
}

defineExpose({ fetchTreeData })
onMounted(() => { fetchTreeData() })
</script>

<style scoped>
.note-folder { height: 100%; border-right: 1px solid #e4e7ed; background-color: #f7f8fa; display: flex; flex-direction: column; }
.top-action { padding: 16px; border-bottom: 1px solid #e4e7ed; }
.new-note-btn { width: 100%; height: 36px; border-radius: 6px; font-weight: bold; }
.folder-header { padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
.folder-header .title { font-size: 14px; color: #8f959e; }
.tree-container { flex: 1; overflow-y: auto; padding: 0 8px; }

/* 覆盖 el-tree 默认样式，打造现代风 */
.custom-tree { background: transparent; }
.custom-tree :deep(.el-tree-node__content) { height: 36px; border-radius: 6px; margin-bottom: 4px; }
.custom-tree :deep(.el-tree-node__content:hover) { background-color: #e8eaf0; }

.custom-tree-node { width: 100%; display: flex; justify-content: space-between; align-items: center; padding-right: 8px; }
.node-left { display: flex; align-items: center; overflow: hidden; }
.note-item { padding-left: 4px; }
.node-label { margin-left: 8px; font-size: 14px; color: #1f2329; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.font-bold { font-weight: 600; color: #1f2329; }
.top-tag { margin-left: 6px; transform: scale(0.8); }

/* 点击高亮背景色 */
.is-active { color: #3370ff !important; }
.is-active .node-label { color: #3370ff; font-weight: bold; }

.action-icon { visibility: hidden; color: #f56c6c; cursor: pointer; }
.custom-tree-node:hover .action-icon { visibility: visible; }
</style>
