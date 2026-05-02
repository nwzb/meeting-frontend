<template>
  <div class="user-management-container">
    <el-card class="feishu-card" shadow="hover">
      <div class="header-actions">
        <span class="title">全平台用户资源监控台</span>
        <div class="search-box">
          <el-input
              v-model="searchQuery"
              placeholder="搜索用户名"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
              prefix-icon="Search"
          />
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </div>
      </div>

      <el-table
          :data="tableData"
          v-loading="loading"
          stripe
          style="width: 100%"
          @sort-change="handleSortChange"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" sortable="custom" />
        <el-table-column prop="username" label="用户名" min-width="120" sortable="custom" />
        <el-table-column prop="role" label="角色身份" min-width="110" sortable="custom">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" effect="light">
              {{ getRoleName(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发起会议数" align="center">
          <el-table-column prop="totalMeetingCount" label="总计" width="90" align="center" sortable="custom" />
          <el-table-column prop="weekMeetingCount" label="本周" width="90" align="center" sortable="custom">
            <template #default="{ row }">
              <span :class="{'danger-text': row.weekMeetingCount > 50}">{{ row.weekMeetingCount }}</span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="上传音频负荷" align="center">
          <el-table-column prop="totalAudioDuration" label="总计" width="110" align="right" sortable="custom">
            <template #default="{ row }">{{ formatDuration(row.totalAudioDuration) }}</template>
          </el-table-column>
          <el-table-column prop="weekAudioDuration" label="本周" width="110" align="right" sortable="custom">
            <template #default="{ row }">{{ formatDuration(row.weekAudioDuration) }}</template>
          </el-table-column>
        </el-table-column>

        <el-table-column label="AI算力消耗时长" align="center">
          <el-table-column prop="totalAiDuration" label="总计" width="110" align="right" sortable="custom">
            <template #default="{ row }">{{ formatDuration(row.totalAiDuration) }}</template>
          </el-table-column>
          <el-table-column prop="weekAiDuration" label="本周" width="110" align="right" sortable="custom">
            <template #default="{ row }">
               <span :class="{'danger-text': row.weekAiDuration > 7200}">
                 {{ formatDuration(row.weekAiDuration) }}
               </span>
            </template>
          </el-table-column>
        </el-table-column>

        <el-table-column prop="createTime" label="注册时间" min-width="160" sortable="custom" />

        <el-table-column label="操作" width="220" fixed="right" align="center">
          <template #default="{ row }">
            <el-button :type="row.role === 0 ? 'success' : 'danger'" link :disabled="row.role === 9" @click="handleToggleBan(row)">
              {{ row.role === 0 ? '解除封禁' : '封禁账号' }}
            </el-button>
            <el-button type="primary" link :disabled="row.role === 9" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button v-if="isSuperAdmin" type="warning" link :disabled="row.role === 9" @click="openRoleDialog(row)">调整角色</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
            v-model:current-page="pageParams.pageNum"
            v-model:page-size="pageParams.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchData"
            @current-change="fetchData"
        />
      </div>
    </el-card>

    <el-dialog v-model="roleDialogVisible" title="分配系统角色" width="400px" custom-class="feishu-dialog">
      <div class="dialog-content">
        <p>正在为用户 <strong>{{ currentUser?.username }}</strong> 调整权限：</p>
        <el-radio-group v-model="selectedRole" class="role-radio-group">
          <el-radio :label="1" border>普通用户</el-radio>
          <el-radio :label="2" border>运维管理员</el-radio>
          <el-radio :label="3" border>审查管理员</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="roleDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="submitRoleChange">确定授权</el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {getUserList, resetUserPassword, updateUserRole, toggleUserBan } from "@/api/admin.ts";
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import type { UserInfo } from '@/types/user'


const userStore = useUserStore()

// 状态定义
const loading = ref(false)
const tableData = ref<UserInfo[]>([])
const total = ref(0)
const searchQuery = ref('')

// 角色弹窗状态
const roleDialogVisible = ref(false)
const submitLoading = ref(false)
const currentUser = ref<UserInfo | null>(null)
const selectedRole = ref<number>(1)

// 增加排序参数
const pageParams = ref({
  pageNum: 1,
  pageSize: 10,
  orderBy: '',
  isAsc: false
})

// 计算属性：判断当前登录用户是否为超级管理员 (role === 9)
const isSuperAdmin = computed(() => userStore.userInfo?.role === 9)

// 角色名称与样式映射
const getRoleName = (role: number) => {
  const map: Record<number, string> = { 0: '已封禁', 1: '普通用户', 2: '运维管理员', 3: '审查管理员', 9: '超级管理员' }
  return map[role] || '未知角色'
}
const getRoleTagType = (role: number) => {
  const map: Record<number, string> = { 0: 'info', 1: 'primary', 2: 'warning', 3: 'danger', 9: 'success' }
  // 封禁状态用纯灰色info，普通用户改回原版飞书蓝primary
  return map[role] || 'info'
}

// 时间格式化工具：秒数转 HH:mm:ss
const formatDuration = (seconds: number | undefined) => {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// 查询操作：重置页码并拉取
const handleSearch = () => {
  pageParams.value.pageNum = 1
  fetchData()
}

// 监听 Element Plus 表头的排序点击
const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  if (!order) {
    // 取消排序，恢复默认
    pageParams.value.orderBy = ''
    pageParams.value.isAsc = false
  } else {
    pageParams.value.orderBy = prop
    pageParams.value.isAsc = order === 'ascending'
  }
  handleSearch()
}

// 获取数据
const fetchData = async () => {
  loading.value = true
  try {
    const res = await getUserList({
      ...pageParams.value,
      username: searchQuery.value
    })
    if (res.code === 200) {
      tableData.value = res.data.records
      total.value = res.data.total
    }
  } finally {
    loading.value = false
  }
}

// 封禁/解封逻辑
const handleToggleBan = (row: UserInfo) => {
  const isBanAction = row.role !== 0
  const actionText = isBanAction ? '封禁' : '解封'

  ElMessageBox.confirm(
      `确定要${actionText}用户【${row.username}】吗？${isBanAction ? '封禁后该用户将无法登录系统！' : ''}`,
      '操作确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: isBanAction ? 'error' : 'warning' }
  ).then(async () => {
    const res = await toggleUserBan(row.id, isBanAction)
    if (res.code === 200) {
      ElMessage.success(`${actionText}成功`)
      fetchData() // 刷新列表
    }
  }).catch(() => {})
}

// 重置密码逻辑
const handleResetPwd = (row: UserInfo) => {
  ElMessageBox.confirm(
      `确定要将用户【${row.username}】的密码重置为 123456 吗？`,
      '高危操作确认',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    const res = await resetUserPassword(row.id)
    if (res.code === 200) {
      ElMessage.success('密码重置成功')
    }
  }).catch(() => {})
}

// 升权逻辑（弹窗控制）
const openRoleDialog = (row: UserInfo) => {
  currentUser.value = row
  selectedRole.value = row.role // 默认选中当前角色
  roleDialogVisible.value = true
}

const submitRoleChange = async () => {
  if (!currentUser.value) return
  if (selectedRole.value === currentUser.value.role) {
    ElMessage.warning('角色未作改变')
    return
  }
  submitLoading.value = true
  try {
    const res = await updateUserRole(currentUser.value.id, selectedRole.value)
    if (res.code === 200) {
      ElMessage.success('角色分配成功！')
      roleDialogVisible.value = false
      fetchData() // 刷新列表
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.user-management-container {
  padding: 24px;

  .feishu-card {
    border-radius: 8px; // 飞书的高级感圆角
    border: none;

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      .title {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .search-box {
        display: flex;
        gap: 12px;
        width: 300px;
      }
    }

    .pagination-wrapper {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }

  .role-radio-group {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    :deep(.el-radio.is-bordered) {
      margin-left: 0;
      margin-right: 0;
      width: 100%;
    }
  }
}

.danger-text {
  color: #F56C6C;
  font-weight: bold;
}
</style>