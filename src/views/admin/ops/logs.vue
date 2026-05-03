<template>
  <div class="logs-container">
    <div class="page-header">
      <h2>模型调用日志 (会议追溯)</h2>
      <div class="filter-actions">
        <el-radio-group v-model="statusFilter" size="small" style="margin-right: 16px;">
          <el-radio-button label="ALL">全部状态</el-radio-button>
          <el-radio-button label="SUCCESS">已完成</el-radio-button>
          <el-radio-button label="PENDING">处理中/异常</el-radio-button>
        </el-radio-group>

        <el-input
            v-model="logQuery.keyword"
            placeholder="搜索标题/会议ID/用户ID/用户名"
            style="width: 280px"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch">
          <template #append><el-button icon="Search" @click="handleSearch" /></template>
        </el-input>
      </div>
    </div>

    <el-card class="feishu-card log-card" shadow="hover">
      <el-table
          :data="filteredLogList"
          v-loading="logLoading"
          style="width: 100%"
          stripe
          @sort-change="handleSortChange"
      >
        <el-table-column label="会议 ID" width="90">
          <template #default="scope">
            <span v-html="highlightText(scope.row.id)"></span>
          </template>
        </el-table-column>

        <el-table-column label="用户 ID" width="90">
          <template #default="scope">
            <span v-html="highlightText(scope.row.userId)"></span>
          </template>
        </el-table-column>

        <el-table-column label="用户名" width="120">
          <template #default="scope">
            <span v-html="highlightText(scope.row.username)"></span>
          </template>
        </el-table-column>

        <el-table-column label="会议标题" min-width="180" show-overflow-tooltip>
          <template #default="scope">
            <span v-html="highlightText(scope.row.title)"></span>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="总时长(s)" width="110" sortable="custom" />
        <el-table-column prop="asrDuration" label="ASR耗时(s)" width="120" sortable="custom" />
        <el-table-column prop="llmDuration" label="LLM耗时(s)" width="120" sortable="custom" />

        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.status === 4 ? 'success' : 'warning'">
              {{ scope.row.status === 4 ? '已完成' : '处理中/异常' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="isVectorized" label="向量化状态" width="130" align="center" sortable="custom">
          <template #default="scope">
            <el-tag :type="scope.row.isVectorized === 1 ? 'success' : 'info'" effect="light">
              {{ scope.row.isVectorized === 1 ? '已向量化' : '未向量化' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="调用时间" width="160" sortable="custom" />

        <el-table-column label="底层排查" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="openLogDrawer(scope.row.id)">
              查看运行日志
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
            v-model:current-page="logQuery.current"
            v-model:page-size="logQuery.size"
            :total="logTotal"
            layout="total, prev, pager, next"
            @current-change="fetchLogs"
        />
      </div>
    </el-card>

    <el-drawer v-model="drawerVisible" title="Python 引擎底层回调日志" size="40%">
      <div v-loading="drawerLoading" class="log-viewer">
        <pre v-if="rawLogContent" class="code-block">{{ rawLogContent }}</pre>
        <el-empty v-else description="该会议暂无底层日志记录" />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getGlobalMeetingLogs, getMeetingLogDetail } from '@/api/admin'

// --- 日志列表逻辑 ---
const logLoading = ref(false)
const logList = ref([])
const logTotal = ref(0)

const logQuery = ref({
  current: 1,
  size: 10,
  keyword: '',
  sortField: 'createTime',
  sortOrder: 'descending'
})

// 记录当前正在生效的搜索词，避免用户在输入框打字时列表疯狂闪烁高亮
const activeKeyword = ref('')

const handleSearch = () => {
  logQuery.value.current = 1
  fetchLogs()
}

const handleSortChange = ({ prop, order }: { prop: string, order: string }) => {
  if (!order) {
    logQuery.value.sortField = 'createTime'
    logQuery.value.sortOrder = 'descending'
  } else {
    logQuery.value.sortField = prop
    logQuery.value.sortOrder = order
  }
  logQuery.value.current = 1
  fetchLogs()
}

const fetchLogs = async () => {
  logLoading.value = true
  activeKeyword.value = logQuery.value.keyword.trim()
  try {
    const res = await getGlobalMeetingLogs(logQuery.value)
    if (res.data) {
      logList.value = res.data.records || []
      logTotal.value = res.data.total || 0
    }
  } finally {
    logLoading.value = false
  }
}

// 文本高亮处理函数
const highlightText = (text: any) => {
  const str = String(text ?? '')
  const kw = activeKeyword.value

  if (!kw) return str

  const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKw})`, 'gi')

  return str.replace(regex, '<span class="highlight-match">$1</span>')
}

// --- 前端过滤逻辑 ---
const statusFilter = ref('ALL')
const filteredLogList = computed(() => {
  if (statusFilter.value === 'ALL') return logList.value
  if (statusFilter.value === 'SUCCESS') return logList.value.filter((item: any) => item.status === 4)
  if (statusFilter.value === 'PENDING') return logList.value.filter((item: any) => item.status !== 4)
  return logList.value
})

// --- 抽屉展示逻辑 ---
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const rawLogContent = ref('')

const openLogDrawer = async (meetingId: string) => {
  drawerVisible.value = true
  drawerLoading.value = true
  rawLogContent.value = ''
  try {
    const res = await getMeetingLogDetail(meetingId)
    if (res.data) rawLogContent.value = res.data
  } catch (error) {
    console.error('获取底层日志失败', error)
  } finally {
    drawerLoading.value = false
  }
}

onMounted(() => {
  fetchLogs()
})
</script>

<style scoped lang="scss">
.logs-container {
  margin: 16px 20px 20px 20px;
  height: calc(100vh - 96px);
  padding: 24px;
  box-sizing: border-box;

  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.02);

  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* ★ 核心修改 2：为 page-header 开启 Flex 布局，实现左右对齐居中 */
  .page-header {
    margin-bottom: 20px;
    flex-shrink: 0;
    display: flex;
    justify-content: space-between; /* 左右两端对齐 */
    align-items: center;            /* 垂直居中对齐 */

    h2 {
      margin: 0;
      color: var(--el-text-color-primary);
      font-weight: 600;
    }
  }

  .feishu-card {
    border-radius: 12px;
    border: none;
    box-shadow: none !important;
    background-color: transparent !important;
  }

  .log-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.el-card__body) {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 0;
      min-height: 0;
      overflow: hidden;
    }

    /* === 表格高度自适应锁死逻辑 === */
    :deep(.el-table) {
      flex: 1;
      height: 100%;
      min-height: 0;
    }

    :deep(.el-table__body-wrapper) {
      overflow-y: hidden !important;
    }

    :deep(.el-table__cell) {
      padding: 9px 0;
    }

    .pagination-wrapper {
      margin-top: 15px;
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }
  }
}

/* --- 抽屉与高亮样式 --- */
.log-viewer {
  height: 100%;
  overflow-y: auto;
  .code-block {
    background-color: #1e1e1e;
    color: #d4d4d4;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

/* 保证右侧筛选项内部元素的对齐 */
.filter-actions {
  display: flex;
  align-items: center;
}

:deep(.highlight-match) {
  color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
  font-weight: bold;
  padding: 0 2px;
  border-radius: 2px;
}
</style>