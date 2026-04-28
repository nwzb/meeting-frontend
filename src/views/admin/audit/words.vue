<template>
  <div class="words-container">
    <el-row :gutter="20" class="full-height">

      <el-col :span="6" class="full-height">
        <el-card shadow="never" class="feishu-card full-height flex-col-card left-card">
          <template #header>
            <div class="card-header">
              <span class="title">主题词库</span>
              <el-button type="primary" link @click="openTopicDialog()">+ 新建</el-button>
            </div>
          </template>

          <el-menu
              :default-active="activeTopicId"
              class="topic-menu"
              @select="handleTopicSelect"
          >
            <el-menu-item index="">
              <span>全部词库 (不限)</span>
            </el-menu-item>

            <el-menu-item v-for="topic in topicList" :key="topic.id" :index="String(topic.id)">
              <div class="topic-item">
                <el-tooltip placement="right" :show-after="400">
                  <template #content>
                    <div style="max-width: 200px;">
                      <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px; line-height: 1.4;">
                        {{ topic.name }}
                      </div>
                      <div style="font-size: 12px; color: #c9cdd4; line-height: 1.4;">
                        {{ topic.description || '暂无描述' }}
                      </div>
                    </div>
                  </template>

                  <div class="topic-name-wrapper">
                    <span class="topic-name" :class="{ 'is-private': topic.isPublic === 0 }">
                      {{ topic.name }}
                    </span>
                    <el-tag v-if="topic.isPublic === 0" size="small" type="warning" effect="plain" class="private-tag">
                      未公开
                    </el-tag>
                  </div>
                </el-tooltip>

                <el-button v-if="topic.id !== 1" type="danger" link @click.stop="handleDeleteTopic(topic.id)">删除</el-button>
                <el-tag v-else size="small" type="info" effect="plain" style="margin-right: 8px;">系统内置</el-tag>
              </div>
            </el-menu-item>
          </el-menu>
        </el-card>
      </el-col>

      <el-col :span="18" class="full-height">
        <el-card shadow="never" class="feishu-card full-height flex-col-card right-card">
          <div class="toolbar">
            <el-form :inline="true" :model="queryParams" class="demo-form-inline">
              <el-form-item label="类型">
                <el-select v-model="queryParams.type" placeholder="全部类型" clearable style="width: 120px">
                  <el-option label="行业术语(热词)" :value="1" />
                  <el-option label="违规敏感词" :value="2" />
                </el-select>
              </el-form-item>
              <el-form-item label="搜索">
                <el-input v-model="queryParams.keyword" placeholder="输入包含的词汇..." clearable />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="fetchWordList">查询</el-button>
                <el-button @click="resetQuery">重置</el-button>
              </el-form-item>
            </el-form>
            <el-button type="primary" @click="openWordDialog()">+ 新增词汇</el-button>
          </div>

          <el-table :data="wordList" style="width: 100%" v-loading="loading" class="feishu-table" stripe>
            <el-table-column prop="word" label="原词 / 敏感词" min-width="250" />

            <el-table-column prop="type" label="类型" min-width="180">
              <template #default="scope">
                <el-tag :type="scope.row.type === 1 ? 'success' : 'danger'" effect="light">
                  {{ scope.row.type === 1 ? '行业术语(热词)' : '违规敏感词' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="libraryName" label="所属词库" min-width="180" />

            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button link type="primary" @click="openWordDialog(scope.row)">编辑</el-button>
                <el-button link type="danger" @click="handleDeleteWord(scope.row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
                v-model:current-page="queryParams.current"
                v-model:page-size="queryParams.size"
                :total="total"
                layout="total, prev, pager, next"
                @current-change="fetchWordList"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="topicDialogVisible" :title="topicForm.id ? '编辑主题词库' : '新建主题词库'" width="400px">
      <el-form :model="topicForm" label-width="80px">
        <el-form-item label="词库名称" required>
          <el-input v-model="topicForm.name" :disabled="topicForm.id === 1" />
        </el-form-item>
        <el-form-item label="词库描述">
          <el-input v-model="topicForm.description" type="textarea" />
        </el-form-item>
        <el-form-item label="公开状态">
          <el-switch v-model="topicForm.isPublic" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="topicDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTopic">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="wordDialogVisible" :title="wordForm.id ? '编辑词汇' : '新增词汇'" width="450px">
      <el-form :model="wordForm" label-width="90px">
        <el-form-item label="所属词库" required>
          <el-select v-model="wordForm.libraryId" placeholder="请选择所属词库" style="width: 100%">
            <el-option v-for="t in topicList" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="词汇类型" required>
          <el-radio-group v-model="wordForm.type">
            <el-radio :label="1">行业术语(热词)</el-radio>
            <el-radio :label="2">违规敏感词</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="词汇内容" required>
          <el-input v-model="wordForm.word" placeholder="例如：AIGC / 违禁词汇" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="wordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitWord">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getTopicList, saveTopic, deleteTopic,
  getWordList, saveWord, deleteWord
} from '@/api/audit'
import type { TopicVO, TopicDTO, WordVO, WordDTO, WordQuery } from '@/types/audit'

// =========== 状态管理 ===========
const topicList = ref<TopicVO[]>([])
const activeTopicId = ref<string>('')

const wordList = ref<WordVO[]>([])
const total = ref(0)
const loading = ref(false)

const queryParams = reactive<WordQuery>({
  current: 1,
  size: 10,
  libraryId: undefined,
  type: undefined,
  keyword: ''
})

// =========== 初始化 ===========
onMounted(async () => {
  await fetchTopicList()
  fetchWordList()
})

// =========== 主题词库逻辑 ===========
const fetchTopicList = async () => {
  const res = await getTopicList()
  if (res.code === 200 && res.data && res.data.records) {
    topicList.value = res.data.records
  } else {
    ElMessage.error(res.msg || '获取词库失败')
  }
}

const handleTopicSelect = (index: string) => {
  activeTopicId.value = index
  queryParams.libraryId = index ? Number(index) : undefined
  queryParams.current = 1
  fetchWordList()
}

const topicDialogVisible = ref(false)
const topicForm = reactive<TopicDTO>({ id: undefined, name: '', description: '', isPublic: 1 })

const openTopicDialog = (row?: TopicVO) => {
  if (row) {
    Object.assign(topicForm, row)
  } else {
    Object.assign(topicForm, { id: undefined, name: '', description: '', isPublic: 1 })
  }
  topicDialogVisible.value = true
}

const submitTopic = async () => {
  if (!topicForm.name) return ElMessage.warning('名称必填')
  const res = await saveTopic(topicForm)
  if (res.code === 200) {
    ElMessage.success('保存成功')
    topicDialogVisible.value = false
    fetchTopicList()
  } else {
    ElMessage.error(res.msg || '保存失败')
  }
}

const handleDeleteTopic = (id: number) => {
  if (id === 1) {
    ElMessage.warning('系统内置词库不可删除')
    return
  }

  ElMessageBox.confirm('删除词库会级联删除关联的热词，确定删除吗?', '警告', { type: 'warning' })
      .then(async () => {
        const res = await deleteTopic(id)
        if (res.code === 200) {
          ElMessage.success('删除成功')
          if (activeTopicId.value === String(id)) activeTopicId.value = ''
          fetchTopicList()
        }
      })
      .catch(() => {})
}

// =========== 热词逻辑 ===========
const fetchWordList = async () => {
  loading.value = true
  try {
    const res = await getWordList(queryParams)
    if (res.code === 200 && res.data) {
      wordList.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

const resetQuery = () => {
  queryParams.type = undefined
  queryParams.keyword = ''
  queryParams.current = 1
  fetchWordList()
}

const wordDialogVisible = ref(false)
const wordForm = reactive<WordDTO>({ id: undefined, libraryId: null, word: '', type: 1 })

const openWordDialog = (row?: WordVO) => {
  if (row) {
    Object.assign(wordForm, row)
  } else {
    const defaultLibId = activeTopicId.value ? Number(activeTopicId.value) : (topicList.value[0]?.id || null)
    Object.assign(wordForm, { id: undefined, libraryId: defaultLibId, word: '', type: 1 })
  }
  wordDialogVisible.value = true
}

const submitWord = async () => {
  if (!wordForm.libraryId || !wordForm.word) return ElMessage.warning('请填写完整信息')
  const res = await saveWord(wordForm)
  if (res.code === 200) {
    ElMessage.success('保存成功')
    wordDialogVisible.value = false
    fetchWordList()
  } else {
    ElMessage.error(res.msg || '保存失败')
  }
}

const handleDeleteWord = (id: number) => {
  ElMessageBox.confirm('确定删除该词汇吗?', '提示', { type: 'warning' })
      .then(async () => {
        const res = await deleteWord(id)
        if (res.code === 200) {
          ElMessage.success('删除成功')
          fetchWordList()
        }
      })
      .catch(() => {})
}
</script>

<style scoped lang="scss">
.words-container {
  /* 100vh (屏幕总高)
     - 60px (顶部面包屑/头像导航栏的平均高度)
     - 40px (本容器上下各20px的padding)
     - 10px (安全呼吸冗余)
     = 110px
  */
  height: calc(100vh - 110px);
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

/* 解决 el-row gutter 导致的负边距溢出问题 */
:deep(.el-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
  width: 100%;
}

.full-height {
  height: 100%;
}

.flex-col-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none; /* 飞书高级感：去卡片边框 */

  :deep(.el-card__body) {
    flex: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    /* 【核心防撑开属性】阻止 flex 子元素(如表格)被内容撑大，强行锁死高度 */
    min-height: 0;
  }
}

/* 左侧词库列表：保留滚动条，因为词库分类可能会很多 */
.left-card :deep(.el-card__body) {
  overflow-y: auto;
}

/* 右侧表格卡片：彻底干掉滚动条，让内容完美适配高度 */
.right-card :deep(.el-card__body) {
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  .title {
    font-weight: 600;
  }
}

.topic-menu {
  border-right: none;
  .topic-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .topic-name-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;
      flex: 1;
      padding-right: 10px;

      .topic-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: color 0.2s;

        &.is-private {
          color: #E6A23C;
          font-weight: 500;
        }
      }

      .private-tag {
        transform: scale(0.85);
        transform-origin: left center;
      }
    }
  }
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-shrink: 0; /* 防止工具栏被挤压 */
}

/* 表格样式微调 */
.feishu-table {
  flex: 1;
  /* 让表格高度完全继承父级，不再自我放飞 */
  height: 100%;
  min-height: 0;

  /* 强制干掉表格内部的滚动条 */
  :deep(.el-table__body-wrapper) {
    overflow-y: hidden !important;
  }

  :deep(.el-table__cell) {
    /* 微调行高，确保10行内容能安稳地装在卡片内 */
    padding: 9px 0;
  }
}

.pagination-wrapper {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0; /* 防止分页组件被挤压 */
}
</style>