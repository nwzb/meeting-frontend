<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
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
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      formatter: '{b}: {c} 场 ({d}%)',
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); border-radius: 8px;'
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      // 图例居右，留出呼吸空间
      right: '8%', 
      top: 'middle',
      height: '80%',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      // 【关键细节】：增加图例项之间的行间距，告别拥挤
      itemGap: 16, 
      textStyle: { color: '#606266', fontSize: 13 },
      formatter: (name: string) => {
        return name.length > 12 ? name.slice(0, 12) + '...' : name;
      }
    },
    color: [
      '#3370FF', '#34C724', '#F53F3F', '#FF7D00', '#FADC19',
      '#14C9C9', '#722ED1', '#F5319D', '#00B42A', '#F77234',
      '#9FDB1D', '#13C2C2', '#3491FA', '#5C33FF', '#CB272D',
      '#00E676', '#FFD600', '#00B0FF', '#651FFF', '#FF1744'
    ],
    series: [
      {
        name: '会议类型分布',
        type: 'pie',
        // 【核心重构1】：标准环形图内外径比例，显得厚实且专业
        radius: ['50%', '75%'], 
        // 【核心重构2】：中心点放在左侧黄金分割点，完美平衡右侧图例
        center: ['35%', '50%'], 
        // 废弃 roseType，不再使用高低不平的碎块
        avoidLabelOverlap: false,
        itemStyle: {
          // 【核心重构3】：大圆角切割，配合纯白描边，现代高级感拉满
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        label: { show: false },
        labelLine: { show: false },
        data: props.data
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