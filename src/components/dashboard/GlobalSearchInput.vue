<template>
  <div class="global-search-container">
    <el-select
        v-model="selectedValue"
        filterable
        remote
        reserve-keyword
        placeholder="搜索会议、笔记或待办..."
        :remote-method="handleSearch"
        :loading="loading"
        class="search-select"
        popper-class="search-dropdown-popper"
        @change="handleSelect"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>

      <el-option
          v-for="item in searchResults"
          :key="item.type + '_' + item.id"
          :value="item"
          :label="item.title"
          class="search-option-item"
      >
        <div class="option-content">
          <div class="option-header">
            <div class="header-left">
              <el-tag :type="getTagType(item.type)" size="small" effect="plain">
                {{ getTypeName(item.type) }}
              </el-tag>
              <span class="title">{{ item.title }}</span>
            </div>
            <span class="time">{{ formatDate(item.createTime) }}</span>
          </div>
          <div class="option-desc">{{ item.highlightContent }}</div>
        </div>
      </el-option>

      <template #empty>
        <div class="empty-state">
          <el-empty description="未找到相关内容" :image-size="60" />
        </div>
      </template>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
import { globalSearch } from '@/api/dashboard'
import type { GlobalSearchVO } from '@/types/dashboard'

const router = useRouter()
const loading = ref(false)
const searchResults = ref<GlobalSearchVO[]>([])
const selectedValue = ref(null)

// 简单的防抖定时器
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 触发远程搜索
const handleSearch = (query: string) => {
  if (query) {
    loading.value = true
    if (debounceTimer) clearTimeout(debounceTimer)

    debounceTimer = setTimeout(async () => {
      try {
        const res = await globalSearch(query)
        // 假设后端拦截器已经处理了 code === 200 的逻辑，直接拿 data
        searchResults.value = res.data || []
      } catch (error) {
        console.error('搜索失败:', error)
      } finally {
        loading.value = false
      }
    }, 500) // 500ms 防抖
  } else {
    searchResults.value = []
  }
}

// 选中结果后的跳转逻辑
const handleSelect = (item: GlobalSearchVO) => {
  // 选完后清空输入框
  selectedValue.value = null

  if (item.type === 'MEETING') {
    // 会议详情动态路由
    router.push(`/meeting/detail/${item.id}`)
  } else if (item.type === 'NOTE') {
    // 笔记路由
    router.push(`/note?id=${item.id}`)
  } else if (item.type === 'TODO') {
    // 待办路由
    router.push(`/todo?id=${item.id}`)
  }
}

// 辅助函数：获取标签类型
const getTagType = (type: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning'> = {
    MEETING: 'primary',
    NOTE: 'success',
    TODO: 'warning'
  }
  return map[type] || 'info'
}

// 辅助函数：获取中文名称
const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    MEETING: '会议',
    NOTE: '笔记',
    TODO: '待办'
  }
  return map[type] || '未知'
}

// 辅助函数：格式化时间，只截取日期部分 YYYY-MM-DD
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  // 兼容 "2026-03-28 15:30:00" 或 "2026-03-28T15:30:00" 的格式
  return dateStr.split(' ')[0].split('T')[0]
}
</script>

<style scoped lang="scss">
.global-search-container {
  /* 已移除 max-width，完全释放宽度，依赖外层容器约束 */
  width: 100%;

  .search-select {
    width: 100%;

    /* 飞书感：略微增加输入框高度和圆角 */
    :deep(.el-input__wrapper) {
      border-radius: 8px;
      padding: 4px 12px;
      box-shadow: 0 0 0 1px var(--el-border-color-light) inset;
      transition: all 0.2s;

      &:hover, &.is-focus {
        box-shadow: 0 0 0 1px var(--el-color-primary) inset;
      }
    }
  }
}

/* 下拉菜单样式定制 (飞书高级感) */
:global(.search-dropdown-popper .el-select-dropdown__item) {
  height: auto !important;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:global(.search-dropdown-popper .el-select-dropdown__item:last-child) {
  border-bottom: none;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.4;

  .option-header {
    display: flex;
    justify-content: space-between; /* 核心：左右两端对齐 */
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 0; /* 核心技巧：允许内部文本超长时截断，防止撑破容器或挤压右侧元素 */

      .title {
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .time {
      font-size: 12px;
      color: var(--el-text-color-regular); /* 使用较弱的颜色淡化时间，突出标题 */
      flex-shrink: 0; /* 绝对禁止时间被压缩 */
      margin-left: 16px; /* 和标题保持安全距离 */
    }
  }

  .option-desc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-left: 48px; /* 约等于标签的宽度，保持视觉对齐 */
  }
}

.empty-state {
  padding: 20px 0;
}
</style>