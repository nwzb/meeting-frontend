<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import type { WordCloudData } from '@/types/dashboard'

const props = defineProps<{
  data: WordCloudData[]
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      show: true,
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      formatter: '{b}: 出现 {c} 次',
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px;'
    },
    series: [
      {
        type: 'wordCloud',
        // 不强制用 circle，以更好地填满长方形容器
        shape: 'pentagon', 
        keepAspect: false,
        left: 'center',
        top: 'center',
        // 【核心修改】：宽高撑满 100%
        width: '100%',
        height: '100%',
        right: null,
        bottom: null,
        // 【核心修改】：极限扩大字体范围，视觉冲击力拉满
        sizeRange: [16, 76], 
        rotationRange: [-45, 45],
        rotationStep: 45,
        // 【核心修改】：缩小字间距，让词云更加紧凑、饱满
        gridSize: 5, 
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: function () {
            const colors = [
              '#337ecc', '#409eff', '#67c23a', '#e6a23c',
              '#79bbff', '#95d475', '#eebe77', '#303133', '#606266'
            ]
            return colors[Math.floor(Math.random() * colors.length)]
          }
        },
        emphasis: {
          focus: 'self',
          textStyle: {
            textShadowBlur: 10,
            textShadowColor: '#909399'
          }
        },
        data: props.data
      }
    ]
  }

  // @ts-ignore
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
  min-height: 300px;
}
</style>