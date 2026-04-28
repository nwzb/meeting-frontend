<template>
  <div class="audit-meetings-container">
    <el-card shadow="never" class="feishu-card main-card">
      <template #header>
        <div class="card-header">
          <span class="title">全平台会议审计台</span>
          <div class="header-actions">
            <el-button
                type="warning"
                icon="Refresh"
                :loading="recalcLoading"
                @click="handleRecalculateAll"
            >
              一键重算敏感词
            </el-button>
          </div>
        </div>
      </template>

      <div class="toolbar">
        <el-form :inline="true" :model="queryParams" class="demo-form-inline">
          <el-form-item label="管控状态">
            <el-select v-model="queryParams.auditStatus" placeholder="全部状态" clearable style="width: 150px">
              <el-option label="正常" :value="0" />
              <el-option label="已归档 (只读)" :value="1" />
              <el-option label="违规屏蔽" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item label="会议标题搜索">
            <el-input v-model="queryParams.keyword" placeholder="输入关键字..." clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchMeetings">查询</el-button>
            <el-button @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
          :data="meetingList"
          style="width: 100%"
          v-loading="loading"
          class="feishu-table"
          stripe
          @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="会议ID" width="100" sortable="custom" />

        <el-table-column prop="title" label="会议标题" min-width="200" show-overflow-tooltip sortable="custom" />

        <el-table-column prop="topicLibraryName" label="所属词库" width="140">
          <template #default="scope">
            <el-tag type="info" effect="plain" round>
              {{ scope.row.topicLibraryName || '默认通用词库' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="userId" label="所属用户" width="140" sortable="custom">
          <template #default="scope">
            <div style="display: flex; flex-direction: column; line-height: 1.2;">
              <span style="font-weight: 600; color: #1f2329;">{{ scope.row.username || '未知用户' }}</span>
              <span style="font-size: 12px; color: #8f959e; margin-top: 4px;">ID: {{ scope.row.userId }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="duration" label="时长(秒)" width="100" />

        <el-table-column prop="sensitiveWordCount" label="敏感词数" width="120" sortable="custom">
          <template #default="scope">
            <span v-if="scope.row.sensitiveWordCount > 0" style="color: #f56c6c; font-weight: bold; font-size: 15px;">
              {{ scope.row.sensitiveWordCount }}
            </span>
            <span v-else style="color: #c9cdd4;">0</span>
          </template>
        </el-table-column>

        <el-table-column label="管控状态" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.auditStatus === 0" type="success" effect="light">正常</el-tag>
            <el-tag v-else-if="scope.row.auditStatus === 1" type="info" effect="light">已归档</el-tag>
            <el-tag v-else-if="scope.row.auditStatus === 2" type="danger" effect="light">违规屏蔽</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" width="180" sortable="custom" />

        <el-table-column label="审计操作" width="200" fixed="right">
          <template #default="scope">
            <el-button
                link
                type="primary"
                @click="$router.push(`/meeting/detail/${scope.row.id}`)"
            >
              查看详情
            </el-button>

            <el-button
                v-if="scope.row.auditStatus !== 0"
                link
                type="primary"
                @click="handleStatusChange(scope.row.id, 0)"
            >
              解除管控
            </el-button>

            <el-button
                v-if="scope.row.auditStatus === 0"
                link
                type="info"
                @click="handleStatusChange(scope.row.id, 1)"
            >
              归档
            </el-button>

            <el-button
                v-if="scope.row.auditStatus === 0 || scope.row.auditStatus === 1"
                link
                type="danger"
                @click="openShieldDialog(scope.row)"
            >
              屏蔽
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
            v-model:current-page="queryParams.current"
            v-model:page-size="queryParams.size"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next"
            @current-change="fetchMeetings"
            @size-change="fetchMeetings"
        />
      </div>
    </el-card>

    <el-dialog v-model="shieldDialogVisible" title="违规屏蔽操作" width="400px">
      <el-form>
        <el-form-item label="屏蔽原因" required>
          <el-input
              v-model="shieldReason"
              type="textarea"
              :rows="3"
              placeholder="请输入前端展示给用户的屏蔽原因..."
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shieldDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="submitShield">确认屏蔽</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { getAuditMeetingList, changeMeetingAuditStatus, recalculateAllSensitiveWords } from '@/api/audit' // 引入新接口

// =========== 状态管理 ===========
const meetingList = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const recalcLoading = ref(false) // 新增：重算按钮的 loading 状态

const queryParams = reactive({
  current: 1,
  size: 10,
  auditStatus: undefined as number | undefined,
  keyword: '',
  sortField: '',
  isAsc: false
})

// 屏蔽弹窗状态
const shieldDialogVisible = ref(false)
const currentShieldId = ref<number | null>(null)
const shieldReason = ref('')

// =========== 初始化 ===========
onMounted(() => {
  fetchMeetings()
})

const fetchMeetings = async () => {
  loading.value = true
  try {
    const res = await getAuditMeetingList(
        queryParams.current,
        queryParams.size,
        queryParams.auditStatus,
        queryParams.keyword,
        queryParams.sortField,
        queryParams.isAsc
    )
    if (res.code === 200 && res.data) {
      meetingList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.msg || '获取列表失败')
    }
  } finally {
    loading.value = false
  }
}

// =========== 新增：一键重算逻辑 ===========
const handleRecalculateAll = () => {
  ElMessageBox.confirm(
      '此操作将遍历重新检索全平台所有会议的录音转写文本和智能摘要，如果数据量较大可能需要数秒钟时间。是否继续？',
      '一键重算确认',
      {
        confirmButtonText: '立即重算',
        cancelButtonText: '取消',
        type: 'warning',
      }
  ).then(async () => {
    recalcLoading.value = true
    try {
      const res = await recalculateAllSensitiveWords()
      if (res.code === 200) {
        ElNotification({
          title: '重算完成',
          message: '已成功基于最新词库更新所有会议的敏感词计数！',
          type: 'success',
        })
        fetchMeetings() // 刷新当前列表，展示最新敏感词数字
      } else {
        ElMessage.error(res.msg || '重算失败')
      }
    } catch (error) {
      ElMessage.error('网络请求异常，请稍后重试')
    } finally {
      recalcLoading.value = false
    }
  }).catch(() => {})
}

// 表格排序变更事件拦截
const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  if (order) {
    queryParams.sortField = prop;
    queryParams.isAsc = order === 'ascending';
  } else {
    queryParams.sortField = '';
    queryParams.isAsc = false;
  }
  queryParams.current = 1;
  fetchMeetings();
}

const resetQuery = () => {
  queryParams.auditStatus = undefined
  queryParams.keyword = ''
  queryParams.sortField = ''
  queryParams.isAsc = false
  queryParams.current = 1
  fetchMeetings()
}

// =========== 状态操作逻辑 ===========
const handleStatusChange = (meetingId: number, targetStatus: number) => {
  const actionText = targetStatus === 0 ? '解除管控并恢复正常' : '归档该会议（用户将无法修改）'
  ElMessageBox.confirm(`确定要 ${actionText} 吗?`, '审计操作', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: targetStatus === 0 ? 'success' : 'info',
  }).then(async () => {
    const res = await changeMeetingAuditStatus({
      meetingId,
      auditStatus: targetStatus,
      auditReason: ''
    })
    if (res.code === 200) {
      ElMessage.success('操作成功')
      fetchMeetings()
    } else {
      ElMessage.error(res.msg || '操作失败')
    }
  }).catch(() => {})
}

const openShieldDialog = (row: any) => {
  currentShieldId.value = row.id
  shieldReason.value = row.auditReason || '涉及敏感词汇，已被系统屏蔽'
  shieldDialogVisible.value = true
}

const submitShield = async () => {
  if (!shieldReason.value) return ElMessage.warning('请填写屏蔽原因')
  if (!currentShieldId.value) return

  const res = await changeMeetingAuditStatus({
    meetingId: currentShieldId.value,
    auditStatus: 2,
    auditReason: shieldReason.value
  })

  if (res.code === 200) {
    ElMessage.success('屏蔽成功')
    shieldDialogVisible.value = false
    fetchMeetings()
  } else {
    ElMessage.error(res.msg || '屏蔽失败')
  }
}
</script>

<style scoped lang="scss">
.audit-meetings-container {
  padding: 20px;
  height: calc(100vh - 100px);
  box-sizing: border-box;
}
.main-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  :deep(.el-card__body) {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}
.card-header {
  display: flex;
  justify-content: space-between; /* 💡 让标题和按钮分居左右 */
  align-items: center;
  .title {
    font-weight: 600;
    /* ★ 核心修改：仅将字号放大到 20px，保持其余布局不动 ★ */
    font-size: 20px;
    color: var(--el-text-color-primary); /* 补充飞书黑颜色 */
  }
}
.toolbar {
  margin-bottom: 20px;
}
.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>