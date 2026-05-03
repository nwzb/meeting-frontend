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
      formatter: '{b}: {c} 场 ({d}%)' // 显示名称、数量和百分比
    },
    legend: {
      bottom: '5%',
      left: 'center',
      icon: 'circle',
      textStyle: { color: '#606266' }
    },
    // 飞书高级感调色盘
    color: ['#337ecc', '#67c23a', '#e6a23c', '#f56c6c', '#909399'],
    series: [
      {
        name: '参会人数统计',
        type: 'pie',
        radius: ['40%', '70%'], // 环形图设计，比实心饼图更具现代感
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8, // 圆角切片
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '16',
            fontWeight: 'bold',
            color: '#303133'
          }
        },
        labelLine: {
          show: false
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