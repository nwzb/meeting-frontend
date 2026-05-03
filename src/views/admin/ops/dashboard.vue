<template>
  <div class="ops-container">
    <div class="page-header">
      <h2>系统运维监控中心</h2>

      <div class="header-actions">
        <span class="picker-label">时间范围：</span>
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
            class="date-picker mr-4"
        />

        <div class="status-tags">
          <el-tag :type="webLatency < 100 ? 'success' : 'warning'" effect="plain" round class="mr-2">
            Web ↔ Java: {{ webLatency }} ms
          </el-tag>
          <el-tag :type="(monitorData.aiNetworkLatency || 0) < 100 ? 'success' : 'warning'" effect="plain" round class="mr-2">
            Java ↔ AI: {{ monitorData.aiNetworkLatency || 0 }} ms
          </el-tag>
          <el-tag :type="monitorData.isAiRunning ? 'danger' : 'success'" effect="dark" round>
            AI 引擎: {{ monitorData.isAiRunning ? '处理中 (BUSY)' : '空闲 (IDLE)' }}
          </el-tag>
        </div>
      </div>
    </div>

    <el-row :gutter="20" class="mb-20">
      <el-col :span="8">
        <el-card class="hardware-card" shadow="hover">
          <div class="hw-header">CPU 使用率</div>
          <el-progress type="dashboard" :percentage="monitorData.cpuUsage" :color="customColors" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="hardware-card" shadow="hover">
          <div class="hw-header">内存 (RAM) 使用率</div>
          <el-progress type="dashboard" :percentage="monitorData.ramUsage" :color="customColors" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="hardware-card" shadow="hover">
          <div class="hw-header">显存 (VRAM - RTX 3050)</div>
          <el-progress type="dashboard" :percentage="monitorData.vramUsage" :color="customColors" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20" v-loading="statsLoading">
      <el-col :span="16">
        <el-card class="feishu-card" shadow="hover">
          <template #header><span class="title">全平台会议处理趋势</span></template>
          <div class="chart-box"><TrendChart :data="statsData.meetingTrend" /></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="feishu-card" shadow="hover">
          <template #header><span class="title">AI 模型平均耗时</span></template>
          <div class="chart-box"><ResourceBarChart :data="statsData.resourceStats" /></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="mb-20" v-loading="statsLoading">
      <el-col :span="8">
        <el-card class="feishu-card" shadow="hover">
          <template #header><span class="title">全平台参会人数分布</span></template>
          <div class="chart-box"><SpeakerPieChart :data="statsData.speakerStats" /></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="feishu-card" shadow="hover">
          <template #header><span class="title">全平台会议类型分布</span></template>
          <div class="chart-box"><TopicPieChart :data="statsData.topicStats" /></div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="feishu-card" shadow="hover">
          <template #header><span class="title">全局高频关键词云</span></template>
          <div class="chart-box"><WordCloud :data="statsData.wordCloud" /></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { getSystemStatus, getGlobalStats } from '@/api/admin'
import type { OpsMonitorVO, AdminOpsStatsVO } from '@/types/dashboard'

import TrendChart from '@/components/dashboard/TrendChart.vue'
import SpeakerPieChart from '@/components/dashboard/SpeakerPieChart.vue'
import TopicPieChart from '@/components/dashboard/TopicPieChart.vue'
import WordCloud from '@/components/dashboard/WordCloud.vue'
import ResourceBarChart from '@/components/dashboard/ResourceBarChart.vue'

// --- 日期筛选逻辑 ---
const dateRange = ref<[string, string] | null>(null)

const shortcuts = [
  {
    text: '本日',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      return [start, end]
    },
  },
  {
    text: '本周',
    value: () => {
      const end = new Date()
      const start = new Date()
      const day = start.getDay() || 7
      start.setDate(start.getDate() - day + 1)
      start.setHours(0, 0, 0, 0)
      return [start, end]
    },
  },
  {
    text: '当月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return [start, end]
    },
  },
  {
    text: '今年',
    value: () => {
      const end = new Date()
      const start = new Date(new Date().getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)
      return [start, end]
    },
  },
]

const handleDateChange = () => {
  fetchStats()
}

// --- 硬件监控逻辑 (优化轮询机制) ---
const monitorData = ref<OpsMonitorVO>({
  cpuUsage: 0, ramUsage: 0, vramUsage: 0, isAiRunning: false, currentMeetingId: null
})
const customColors = [
  { color: '#67c23a', percentage: 50 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#f56c6c', percentage: 100 }
]

let pollTimer: number | null = null
const webLatency = ref(0)
const isFetchingStatus = ref(false) // 新增请求锁

const fetchSystemStatus = async () => {
  if (isFetchingStatus.value) return // 防重叠处理
  isFetchingStatus.value = true

  try {
    const start = Date.now()
    const res = await getSystemStatus()
    const end = Date.now()
    if (res.data) {
      monitorData.value = res.data
      const totalLatency = end - start
      const aiLatency = res.data.aiNetworkLatency || 0
      webLatency.value = Math.max(1, totalLatency - aiLatency)
    }
  } catch (error) {
    console.error('获取硬件监控失败:', error)
    webLatency.value = 999
    monitorData.value.aiNetworkLatency = 999
  } finally {
    isFetchingStatus.value = false
    // 递归调用，确保每次请求完成后才开始下一次 2 秒的计时
    pollTimer = window.setTimeout(fetchSystemStatus, 2000)
  }
}

// --- 统计图表逻辑 ---
const statsLoading = ref(false)

const statsData = ref<AdminOpsStatsVO>({
  meetingTrend: [],
  speakerStats: [],
  topicStats: [],
  wordCloud: [],
  resourceStats: { avgAsrDuration: 0, avgLlmDuration: 0 }
})

const fetchStats = async () => {
  statsLoading.value = true
  try {
    let startDate = undefined
    let endDate = undefined
    if (dateRange.value && dateRange.value.length === 2) {
      startDate = `${dateRange.value[0]} 00:00:00`
      endDate = `${dateRange.value[1]} 23:59:59`
    }

    const res = await getGlobalStats({ startDate, endDate })
    if (res.data) statsData.value = res.data
  } finally {
    statsLoading.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchSystemStatus() // 首次调用，内部会自动开启 setTimeout 轮询
})

onBeforeUnmount(() => {
  if (pollTimer) clearTimeout(pollTimer) // 注意这里改成了 clearTimeout
})
</script>

<style scoped lang="scss">
.ops-container {
  padding: 24px;
  background-color: transparent;
  min-height: 100%;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    h2 { margin: 0; color: var(--el-text-color-primary); font-weight: 600; }

    .header-actions {
      display: flex;
      align-items: center;

      .picker-label {
        font-size: 14px;
        color: var(--el-text-color-regular);
        margin-right: 8px;
      }

      .date-picker {
        width: 280px;
      }
    }
  }

  .status-tags { display: flex; align-items: center; }
  .mr-2 { margin-right: 8px; }
  .mr-4 { margin-right: 16px; }

  .hardware-card {
    text-align: center;
    border-radius: 12px;
    padding: 10px 0;
    .hw-header { font-size: 16px; font-weight: bold; margin-bottom: 16px; color: var(--el-text-color-regular); }
  }

  .feishu-card {
    border-radius: 12px;
    border: none;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.04);
    .title { font-weight: 600; font-size: 16px; }
  }

  .chart-box { height: 320px; width: 100%; }
  .mb-20 { margin-bottom: 20px; }
}
</style>