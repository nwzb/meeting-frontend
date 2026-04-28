<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as echarts from 'echarts'
import type { ResourceStats } from '@/types/dashboard'

const props = defineProps<{
  data: ResourceStats | null
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value || !props.data) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)

  // ★ 核心逻辑：数据预处理，确保数值严格保留两位小数
  const asrVal = Number(props.data.avgAsrDuration || 0).toFixed(2);
  const llmVal = Number(props.data.avgLlmDuration || 0).toFixed(2);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      axisPointer: { type: 'shadow' },
      // ★ 核心修改 1：悬浮提示框显示两位小数
      formatter: function (params: any) {
        const item = params[0];
        return `${item.name}: <b>${Number(item.value).toFixed(2)}</b> 秒`;
      }
    },
    grid: {
      left: '2%',
      right: '2%',
      bottom: '5%',
      top: '12%', // 留一点位置给柱子顶部的 Label
      containLabel: true // 开启自适应，确保刻度文字不溢出
    },
    xAxis: {
      type: 'category',
      data: ['ASR 识别', 'LLM 总结'],
      axisLabel: { color: '#606266', fontSize: 12 },
      axisLine: { lineStyle: { color: '#f0f0f0' } },
    },
    yAxis: {
      type: 'value',
      name: '平均耗时 (秒)',
      nameTextStyle: { color: '#909399', padding: [0, 0, 10, 0] },
      splitLine: { lineStyle: { type: 'dashed', color: '#ebeef5' } },
      axisLabel: { color: '#606266' }
    },
    series: [
      {
        type: 'bar',
        barWidth: '35%',
        data: [
          { value: asrVal, itemStyle: { color: '#337ecc' } },
          { value: llmVal, itemStyle: { color: '#67c23a' } }
        ],
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          // 增加一点阴影感，提升高级感
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.05)'
        },
        label: {
          show: true,
          position: 'top',
          color: '#606266',
          fontWeight: 'bold',
          // ★ 核心修改 2：柱状图上方文字显示两位小数
          formatter: function (params: any) {
            return Number(params.value).toFixed(2) + ' s';
          }
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

// 采用更稳定的 watch 策略
watch(() => props.data, (newData) => {
  if (newData) initChart();
}, { deep: true })

const handleResize = () => chartInstance?.resize()

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped lang="scss">
.chart-container {
  width: 100%;
  height: 100%;
  min-height: 300px;
}
</style>