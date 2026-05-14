<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { PieData } from '@/types/dashboard' // 数据结构不变，仍然复用

const props = defineProps<{
  data: PieData[]
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)

  // 提取高级感配色
  const colors = ['#337ecc', '#67c23a', '#e6a23c', '#f56c6c', '#909399']
  // 计算总数（用于 Tooltip 显示百分比）
  const total = props.data.reduce((sum, item) => sum + item.value, 0)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      formatter: (params: any) => {
         const p = params[0]
         const percent = total > 0 ? ((p.value / total) * 100).toFixed(1) : 0
         return `
            <div style="font-weight:bold;margin-bottom:4px;">${p.name}</div>
            <span style="display:inline-block;margin-right:6px;border-radius:50%;width:10px;height:10px;background-color:${p.color};"></span>
            ${p.value} 场 <span style="color:#909399;font-size:12px;margin-left:4px;">(${percent}%)</span>
         `
      },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px;'
    },
    grid: {
      top: '10%',
      left: '2%',
      right: '12%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      splitLine: { show: false },
      axisLabel: { show: false },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: props.data.map(d => d.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#303133',
        fontSize: 14,
        fontWeight: 'bold',
        margin: 16
      }
    },
    series: [
      {
        name: '参会人数',
        type: 'bar',
        barWidth: 22,
        showBackground: true,
        backgroundStyle: {
          color: '#f0f2f5',
          borderRadius: [0, 10, 10, 0]
        },
        itemStyle: {
          borderRadius: [0, 10, 10, 0],
          color: (params: any) => colors[params.dataIndex % colors.length] || '#337ecc'
        },
        label: {
          show: true,
          position: 'right',
          distance: 12,
          formatter: '{c} 场',
          color: '#606266',
          fontSize: 13,
          fontWeight: 'bold'
        },
        data: props.data.map(d => d.value)
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(
    () => props.data,
    (newData) => {
      if (newData && newData.length > 0) {
        nextTick(() => {
          initChart()
        })
      }
    },
    { deep: true }
)

const handleResize = () => {
  if (chartInstance) chartInstance.resize()
}

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
  min-height: 320px;
}
</style>
