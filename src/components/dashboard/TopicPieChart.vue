<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import type { PieData } from '@/types/dashboard'

const props = defineProps<{
  data: PieData[]
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      formatter: '{b}: {c} 场 ({d}%)'
    },
    legend: {
      bottom: '0%',
      left: 'center',
      icon: 'roundRect',
      textStyle: { color: '#606266', fontSize: 12 },
      itemWidth: 14,
      itemHeight: 8
    },
    // 采用与参会人数不同的色系：紫、青、深蓝等，体现会议主题的稳重感
    color: ['#7b61ff', '#00b5e2', '#337ecc', '#a78bfa', '#67c23a', '#909399'],
    series: [
      {
        name: '会议类型分布',
        type: 'pie',
        radius: ['35%', '65%'], // 比参会人数饼图稍微粗一点的环形
        center: ['50%', '45%'], // 稍微向上偏移，给底部 legend 留空间
        roseType: 'area', // 开启南丁格尔玫瑰图效果，数据大小通过半径区分，更具数据张力
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'outside',
          formatter: '{b}',
          color: '#606266'
        },
        labelLine: {
          length: 10,
          length2: 15,
          smooth: true
        },
        data: props.data
      }
    ]
  }

  chartInstance.setOption(option)
}

watch(
    () => props.data,
    (newData) => {
      if (newData && newData.length > 0) initChart()
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
  min-height: 300px;
}
</style>