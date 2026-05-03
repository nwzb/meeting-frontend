<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud' // 必须导入词云插件
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
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      formatter: '{b}: 出现 {c} 次'
    },
    series: [
      {
        type: 'wordCloud',
        shape: 'circle', // 词云的整体轮廓
        keepAspect: false,
        left: 'center',
        top: 'center',
        width: '90%',
        height: '90%',
        right: null,
        bottom: null,
        sizeRange: [14, 40], // 字体大小的范围
        rotationRange: [-45, 45], // 旋转角度范围
        rotationStep: 45,
        gridSize: 8, // 词与词之间的间距
        drawOutOfBound: false,
        layoutAnimation: true,
        textStyle: {
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          // 飞书风格：限制随机颜色的范围，使其偏向专业的蓝/绿/深灰
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

  // @ts-ignore 因为echarts官方类型未包含wordCloud，这里忽略TS警告
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