<template>
  <div ref="chartRef" class="box-card"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { EChartsOption } from 'echarts'
import { chartPool } from '@/utils/chartPool'

const chartRef = ref<HTMLDivElement>()
const CHART_KEY = 'daily-7day'

const props = defineProps<{
  chartOption: EChartsOption | null
}>()

// 渲染图表
function renderChart() {
  if (!props.chartOption || !chartRef.value) return false
  if (!chartPool.has(CHART_KEY)) {
    chartPool.acquire(CHART_KEY, chartRef.value)
  }
  chartPool.update(CHART_KEY, props.chartOption)
  return true
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  renderChart()
  // 用 ResizeObserver 监听容器尺寸变化（比 window.resize 更精确）
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartPool.resizeAll()
    })
    resizeObserver.observe(chartRef.value)
  }
})

watch(
  () => props.chartOption,
  async (option) => {
    if (!option) return
    await nextTick()
    renderChart()
  },
)

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  chartPool.release(CHART_KEY)
})
</script>

<style scoped>
.box-card {
  width: 100%;
  height: 100%;
}
</style>
