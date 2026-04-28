<template>
  <div class="chart-container" ref="chartRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import type { TrendData } from '@/types/dashboard'

const props = defineProps<{
  data: TrendData[]
}>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const updateChart = () => {
  if (!chartInstance) return

  const safeData = props.data || []
  const xAxisData = safeData.map(item => item.date)
  const countData = safeData.map(item => item.count)
  const durationData = safeData.map(item => (item.duration || 0) / 60)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ebeef5',
      textStyle: { color: '#333' },
      axisPointer: { type: 'line', lineStyle: { color: '#337ecc', type: 'dashed' } }
    },
    legend: {
      data: ['处理会议数', '累计时长(分钟)'],
      bottom: '0%',
      textStyle: { color: '#606266' }
    },
    grid: {
      left: 40,      // 从 60 压缩到 40
      right: 45,     // 从 60 压缩到 45
      bottom: 65,    // 稍微给底部留点空间防止日期重叠
      top: 45,       // 给顶部 y 轴名称留出空间
      containLabel: false
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisLabel: { color: '#606266' }
    },
    yAxis: [
      {
        type: 'value',
        name: '数量(场)',
        minInterval: 1,
        position: 'left',
        splitLine: { show: true, lineStyle: { type: 'dashed', color: '#ebeef5' } },
        axisLabel: { color: '#606266' },
        nameTextStyle: { color: '#909399' },
        alignTicks: true
      },
      {
        type: 'value',
        name: '时长(分钟)',
        position: 'right',
        minInterval: 1,
        splitLine: { show: false, lineStyle: { type: 'dashed', color: '#ebeef5' } },
        axisLabel: {
          color: '#606266',
          // ★ 终极防报错：使用标准 function 并声明联合类型，彻底满足 TS 检查
          formatter: function (value: number | string) {
            return String(Math.floor(Number(value)));
          }
        },
        nameTextStyle: { color: '#909399' },
        alignTicks: true
      }
    ],
    series: [
      {
        name: '处理会议数',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#337ecc', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { width: 3, color: '#337ecc' },
        // ★ 核心修复 1：使用声明式对象替换 new LinearGradient
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(51, 126, 204, 0.3)' },
              { offset: 1, color: 'rgba(51, 126, 204, 0.05)' }
            ]
          }
        },
        tooltip: {
          valueFormatter: function (value: number | string | undefined) {
            return (value || 0) + ' 场';
          }
        },
        data: countData
      },
      {
        name: '累计时长(分钟)',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#67c23a', borderColor: '#fff', borderWidth: 2 },
        lineStyle: { width: 3, color: '#67c23a', type: 'solid' },
        // ★ 核心修复 2：使用声明式对象替换 new LinearGradient
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
              { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
            ]
          }
        },
        tooltip: {
          valueFormatter: function (value: number | string | undefined) {
            return Number(value || 0).toFixed(2) + ' 分钟';
          }
        },
        data: durationData
      }
    ] as any[] // ★ 终极补丁：在这里强制断言，堵住 TS 的所有报错嘴巴
  }

  chartInstance.setOption(option)
}

watch(
    () => props.data,
    (newData) => {
      if (newData) updateChart()
    },
    { deep: true }
)

const handleResize = () => {
  if (chartInstance) chartInstance.resize()
}

onMounted(() => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  chartInstance.on('legendselectchanged', (params: any) => {
    const isLeftShow = params.selected['处理会议数'] !== false
    const isRightShow = params.selected['累计时长(分钟)'] !== false

    chartInstance?.setOption({
      yAxis: [
        {
          alignTicks: isLeftShow && isRightShow,
          splitLine: { show: isLeftShow || (!isLeftShow && !isRightShow) }
        },
        {
          alignTicks: isLeftShow && isRightShow,
          splitLine: { show: !isLeftShow && isRightShow }
        }
      ]
    })
  })

  updateChart()
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