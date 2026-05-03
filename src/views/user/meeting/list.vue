<template>
  <div class="meeting-list-container">
    <div class="list-header">
      <div class="title-section">
        <h2 class="page-title">我的会议</h2>
        <span class="subtitle">共 {{ meetings.length }} 条记录</span>
      </div>
      <div class="action-section">
        <el-input
            v-model="queryParams.keyword"
            placeholder="搜索会议标题 (按回车搜索)"
            :prefix-icon="Search"
            class="search-input"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
        />
        <el-button type="primary" :icon="Plus" @click="uploadDialogVisible = true">
          新建识别任务
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="list-content">
      <el-empty v-if="filteredMeetings.length === 0" description="暂无会议记录" />

      <el-table
          v-else
          :data="filteredMeetings"
          style="width: 100%"
          class="meeting-table"
          @sort-change="handleSortChange"
      >
        <el-table-column prop="title" label="会议名称" min-width="250" sortable="custom">
          <template #default="{ row }">
            <div class="meeting-info-cell" @click="goToDetail(row.id)">
              <el-icon class="file-icon"><Microphone /></el-icon>
              <span class="meeting-name">{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="topicLibraryName" label="会议主题词库" width="150" sortable="custom">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" round>
              {{ row.topicLibraryName || '默认通用词库' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="duration" label="时长(秒)" width="120" sortable="custom" />

        <el-table-column label="状态" width="200">
          <template #default="{ row }">
            <div class="status-cell">
              <StatusTag :status="row.status" />
              <el-tag v-if="row.auditStatus === 1" type="warning" effect="dark" round size="small">
                已归档
              </el-tag>
              <el-tag v-if="row.auditStatus === 2" type="danger" effect="dark" round size="small">
                已屏蔽
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" width="200" sortable="custom" />

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
                v-if="row.auditStatus !== 2"
                link
                type="primary"
                @click="goToDetail(row.id)"
            >
              查看
            </el-button>
            <el-button
                v-else
                link
                type="danger"
                @click="showBlockedDialog(row)"
            >
              查看
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
            v-model:current-page="queryParams.pageNum"
            v-model:page-size="queryParams.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="fetchList"
            @size-change="fetchList"
        />
      </div>
    </div>

    <el-dialog
        v-model="uploadDialogVisible"
        title="发起新任务"
        width="500px"
        @close="resetUploadForm"
    >
      <el-form :model="uploadForm" label-position="top">
        <el-form-item label="会议标题" required>
          <el-input v-model="uploadForm.title" placeholder="请输入会议标题" />
        </el-form-item>

        <el-form-item label="选择主题库" required>
          <el-select v-model="uploadForm.topicId" placeholder="请选择行业主题库" style="width: 100%">
            <el-option
                v-for="item in topicLibraries"
                :key="item.id"
                :label="item.name"
                :value="item.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ item.name }}</span>
                <span style="color: var(--el-text-color-secondary); font-size: 12px; margin-left: 10px;">
                  {{ item.description }}
                </span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="音频文件">
          <el-upload
              class="upload-demo"
              drag
              action="#"
              :auto-upload="false"
              :on-change="handleFileChange"
              :limit="1"
              accept=".mp3,.wav,.m4a"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              将音频拖到此处，或<em>点击上传</em>
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploading" @click="submitUpload">
          开始识别
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
        v-model="blockedDialogVisible"
        title="会议已被屏蔽"
        width="420px"
        :close-on-click-modal="false"
    >
      <div class="blocked-dialog-content">
        <el-icon :size="48" color="#f56c6c" style="display: block; margin: 0 auto 16px;">
          <WarningFilled />
        </el-icon>
        <p class="blocked-reason">{{ blockedReason || '该会议因涉及敏感内容已被系统屏蔽' }}</p>
        <p class="blocked-hint">如有问题请联系管理员</p>
      </div>
      <template #footer>
        <el-button type="primary" @click="blockedDialogVisible = false">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { storeToRefs } from 'pinia';
import { meetingApi } from '@/api/meeting';
import { useDictStore } from '@/store/dict';
import StatusTag from '@/components/common/StatusTag.vue';
import { Microphone, Search, Plus, UploadFilled, WarningFilled } from '@element-plus/icons-vue';

const dictStore = useDictStore();
const { topicLibraries } = storeToRefs(dictStore);
const router = useRouter();

// ★ 修改：增加排序参数
const queryParams = reactive({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  sortField: '', // 当前排序字段
  isAsc: false   // 是否升序
});

const loading = ref(false);
const meetings = ref<any[]>([]);
const total = ref(0);

const uploadDialogVisible = ref(false);
const uploading = ref(false);
const uploadForm = ref({
  title: '',
  topicId: null as number | null,
  file: null as File | null,
  duration: 0
});

const blockedDialogVisible = ref(false);
const blockedReason = ref('');

const showBlockedDialog = (row: any) => {
  blockedReason.value = row.auditReason || '该会议因涉及敏感内容已被系统屏蔽';
  blockedDialogVisible.value = true;
};

let pollTimer: ReturnType<typeof setInterval> | null = null;

const checkPolling = (list: any[]) => {
  const hasProcessing = list.some(m => [1, 2, 3].includes(m.status));
  if (hasProcessing && !pollTimer) {
    pollTimer = setInterval(fetchList, 5000);
  } else if (!hasProcessing && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

// 本地模糊搜索（为了兼容不触发后端接口的快速过滤）
const filteredMeetings = computed(() => {
  const list = Array.isArray(meetings.value) ? meetings.value : [];
  if (!queryParams.keyword) return list;
  return list.filter(m => m.title?.toLowerCase().includes(queryParams.keyword.toLowerCase()));
});

const fetchList = async () => {
  if (!pollTimer) loading.value = true;
  try {
    const res = await meetingApi.getList(queryParams);
    if (res && res.data) {
      meetings.value = res.data.records || res.data;
      total.value = res.data.total || 0; // 从后端分页对象中提取总数
    } else {
      meetings.value = Array.isArray(res) ? res : [];
      total.value = 0; // 无数据时归零
    }
    checkPolling(meetings.value);
  } catch (error) {
    console.error('获取列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// ★ 新增：触发后端搜索
const handleSearch = () => {
  queryParams.pageNum = 1;
  fetchList();
};

// ★ 新增：表格排序拦截，并将参数传给后端
const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  if (order) {
    queryParams.sortField = prop;
    queryParams.isAsc = order === 'ascending';
  } else {
    queryParams.sortField = '';
    queryParams.isAsc = false;
  }
  queryParams.pageNum = 1;
  fetchList();
};

onMounted(() => {
  dictStore.fetchTopicLibraries();
  fetchList();
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const resetUploadForm = () => {
  uploadForm.value = { title: '', topicId: null, file: null, duration: 0};
};

const handleFileChange = (uploadFile: any) => {
  const file = uploadFile.raw;
  uploadForm.value.file = file;

  if (file) {
    const audioUrl = URL.createObjectURL(file);
    const audioObj = new Audio(audioUrl);

    audioObj.onloadedmetadata = () => {
      uploadForm.value.duration = Math.round(audioObj.duration);
      URL.revokeObjectURL(audioUrl);
    };

    audioObj.onerror = () => {
      uploadForm.value.duration = 0;
      URL.revokeObjectURL(audioUrl);
    };
  }
};

const submitUpload = async () => {
  const { title, topicId, file, duration} = uploadForm.value;
  if (!title || !topicId || !file) {
    return ElMessage.warning('请填写完整信息');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('topicId', topicId.toString());
  formData.append('duration', duration.toString());

  uploading.value = true;
  try {
    await meetingApi.uploadAudio(formData);
    ElMessage.success('任务已提交，系统正在排队识别');
    uploadDialogVisible.value = false;
    fetchList();
  } finally {
    uploading.value = false;
  }
};

const goToDetail = (id: string | number) => {
  router.push(`/meeting/detail/${id}`);
};

const handleDelete = (row: any) => {
  // 从 row 中取出状态和 id
  const status = row.status;
  const id = row.id;

  const isProcessing = [1, 2, 3].includes(status);

  const confirmMsg = isProcessing
      ? `该会议正在进行 AI 处理（状态：${status}）。此时删除将强制中断 AI 任务，且数据无法恢复。是否继续？`
      : '确定要彻底删除该会议及所有相关纪要、待办吗？此操作不可逆！';

  const confirmType = isProcessing ? 'error' : 'warning';

  ElMessageBox.confirm(confirmMsg, '严重警告', {
    type: confirmType,
    confirmButtonText: '确定删除',
    cancelButtonText: '取消'
  }).then(async () => {
    // 调接口时传入提取出的 id
    await meetingApi.deleteMeeting(id);
    ElMessage.success('会议已彻底删除');
    fetchList();
  }).catch(() => {});
};
</script>

<style lang="scss" scoped>
.meeting-list-container {
  /* ★ 核心修改 1：把原本的 padding 顶部稍微收紧到 20px */
  padding: 20px 24px 24px 24px;
  /* ★ 核心修改 2：彻底干掉外围的 margin，因为全局 layout 已经有 20px 的内边距了 */
  margin: 0;
  background: #fff; /* 如果你之前想让它透明，这里可以改成 transparent */
  min-height: calc(100vh - 140px); /* 去掉margin后，高度计算可以更饱满一些 */
  border-radius: 8px;
  /* 可以加一点极淡的阴影让白色卡片更立体 */
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.02);

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      /* ★ 核心修改 3：重置 h2 原生自带的 margin-top */
      margin: 0 0 4px 0;
    }
    .subtitle { font-size: 13px; color: #86909c; }

    .action-section {
      display: flex;
      gap: 16px;
      .search-input { width: 240px; }
    }
  }

  .meeting-table {
    .status-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meeting-info-cell {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      &:hover .meeting-name { color: #337ecc; }
      .file-icon { font-size: 20px; color: #337ecc; }
      .meeting-name { font-weight: 500; transition: color 0.2s; }
    }
  }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.blocked-dialog-content {
  text-align: center;
  padding: 8px 0;
  .blocked-reason {
    font-size: 15px;
    color: #333;
    line-height: 1.6;
    margin: 0 0 12px;
  }
  .blocked-hint {
    font-size: 13px;
    color: #999;
    margin: 0;
  }
}
</style>