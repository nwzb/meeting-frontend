<template>
  <div class="dashboard-container">
    <div class="header-section">
      <div class="welcome-text">
        <h1 class="greeting">高效会议，由此启航</h1>
        <p class="subtitle">在这里总览您的会议数据、待办事项与核心沉淀</p>
      </div>
    </div>

    <div class="data-board" v-loading="loading">
      <div class="filter-bar">
        <div class="filter-left">
          <span class="filter-label">时间范围：</span>
          <div class="date-picker-wrapper">
            <el-date-picker
                v-model="dateRange"
                type="daterange"
                unlink-panels
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                :shortcuts="shortcuts"
                value-format="YYYY-MM-DD"
                @change="handleDateChange"
            />
          </div>
        </div>

        <div class="filter-right search-horizontal-wrapper">
          <GlobalSearchInput />
        </div>
      </div>

      <el-row :gutter="20" class="mb-20">
        <el-col :xs="24" :sm="24" :md="16" :lg="16" class="mb-xs-20">
          <el-card class="feishu-card h-full" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="title">近期会议处理趋势</span>
              </div>
            </template>
            <div class="chart-box trend-box">
              <TrendChart :data="statsData.meetingTrend" />
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="24" :md="8" :lg="8">
          <div class="assistant-wrapper" style="height: 460px;">
            <SuperAssistant />
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-20">
        <el-col :xs="24" :sm="24" :md="12" :lg="12" class="mb-xs-20">
          <el-card class="feishu-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="title">参会人数规模分布</span>
              </div>
            </template>
            <div class="chart-box">
              <SpeakerBarChart :data="statsData.speakerStats" />
            </div>
          </el-card>
        </el-col>

        <el-col :xs="24" :sm="24" :md="12" :lg="12" class="mb-xs-20">
          <el-card class="feishu-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="title">会议类型占比</span>
              </div>
            </template>
            <div class="chart-box">
              <TopicPieChart :data="statsData.topicStats" />
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mb-20">
        <el-col :span="24">
          <el-card class="feishu-card" shadow="hover">
            <template #header>
              <div class="card-header">
                <span class="title">会议高频关键词云</span>
                <el-tooltip content="基于AI提取的会议核心词汇汇总" placement="top">
                  <el-icon class="help-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
            </template>
            <div class="chart-box wordcloud-box">
              <WordCloud :data="statsData.wordCloud" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { getDashboardStats } from '@/api/dashboard'
import type { DashboardStatsVO } from '@/types/dashboard'
import GlobalSearchInput from '@/components/dashboard/GlobalSearchInput.vue'
import TrendChart from '@/components/dashboard/TrendChart.vue'
import SpeakerBarChart from '@/components/dashboard/SpeakerBarChart.vue'
import TopicPieChart from '@/components/dashboard/TopicPieChart.vue'
import WordCloud from '@/components/dashboard/WordCloud.vue'
import SuperAssistant from '@/components/dashboard/SuperAssistant.vue'

const loading = ref(false)
const dateRange = ref<[string, string] | null>(null)

const shortcuts = [
  { text: '本日', value: () => [new Date().setHours(0,0,0,0), new Date()] },
  { text: '本周', value: () => {
      const end = new Date(); const start = new Date();
      const day = start.getDay() || 7; start.setDate(start.getDate() - day + 1);
      return [start.setHours(0,0,0,0), end]
    }},
  { text: '当月', value: () => [new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()] },
  { text: '今年', value: () => [new Date(new Date().getFullYear(), 0, 1), new Date()] }
]

const statsData = ref<DashboardStatsVO>({
  meetingTrend: [],
  speakerStats: [],
  topicStats: [],
  wordCloud: []
})

const fetchStatsData = async () => {
  loading.value = true
  try {
    let params: { startDate?: string; endDate?: string } = {}
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = `${dateRange.value[0]} 00:00:00`
      params.endDate = `${dateRange.value[1]} 23:59:59`
    }
    const res = await getDashboardStats(params)
    if (res.data) statsData.value = res.data
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleDateChange = () => fetchStatsData()
onMounted(() => fetchStatsData())
</script>

<style scoped lang="scss">
.dashboard-container {
  padding: 12px 24px 24px 24px;
  background-color: transparent;
  min-height: 100%;

  .header-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 24px;
    padding-top: 20px;

    .welcome-text {
      text-align: center;
      .greeting {
        font-size: 48px;
        font-weight: 800;
        margin: 0 0 12px 0;
        letter-spacing: 3px;
        background: linear-gradient(135deg, #1848b8 0%, var(--el-color-primary) 50%, #005eff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: titleFadeInUp 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      }
      .subtitle {
        font-size: 16px;
        color: var(--el-text-color-secondary);
        animation: titleFadeInUp 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 0.15s forwards;
      }
    }
  }

  @keyframes titleFadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .filter-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 0; // 仅保留极微小的内边距对齐卡片

    .filter-left {
      display: flex;
      align-items: center;
      flex-shrink: 0; // 保证左侧不被压缩
      .filter-label {
        font-size: 14px;
        color: var(--el-text-color-regular);
        margin-right: 8px;
      }
    }

    /* 【核心修改】：通过限制 max-width 来缩短搜索框，同时利用 flex: 1 和 space-between 保持右对齐 */
    .search-horizontal-wrapper {
      flex: 1;
      margin-left: 32px; // 搜索框距离日期选择器的间距
      max-width: 600px;  // 【修改】：从 none 改为合理的最大宽度限制，防止拉得太长
      animation: titleFadeInUp 0.8s cubic-bezier(0.25, 0.8, 0.25, 1) 0.2s forwards;
      opacity: 0;

      /* 下拉组件内部样式撑满 */
      :deep(.el-input), :deep(.el-input__wrapper) {
        width: 100%;
      }
    }

    :deep(.date-picker-wrapper) {
      width: 260px;
      .el-date-editor { width: 100% !important; }
    }
  }

  .feishu-card {
    border: none;
    border-radius: 12px;
    background: var(--el-bg-color-overlay);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.04) !important;

    &:hover {
      box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.08) !important;
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .title { font-size: 16px; font-weight: 600; gap: 6px; }
    }
  }

  .chart-box { width: 100%; height: 320px; }
  .wordcloud-box { height: 360px; }
  .trend-box { height: 360px; }
  .mb-20 { margin-bottom: 20px; }
}
</style>