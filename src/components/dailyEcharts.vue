<template>
  <div ref="chartRef" class="box-card"></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { EChartsOption } from 'echarts'
import type { ChartSchema } from '@/types/chartSchema'
import { chartPool } from '@/utils/chartPool'
import { getResponsivePatch } from '@/utils/chartResponsive'
import { schemaToOption } from '@/utils/schemaRenderer'

const chartRef = ref<HTMLDivElement>()
const CHART_KEY = 'daily-7day'

const props = defineProps<{
  chartOption: EChartsOption | null
  schemaOption?: ChartSchema | null
}>()

// schema 优先，自动转为 option
const resolvedOption = computed(() => {
  if (props.schemaOption) return schemaToOption(props.schemaOption, 'daily')
  return props.chartOption
})

// 渲染图表
function renderChart() {
  const option = resolvedOption.value
  if (!option || !chartRef.value) return false
  if (!chartPool.has(CHART_KEY)) {
    chartPool.acquire(CHART_KEY, chartRef.value)
  }
  chartPool.update(CHART_KEY, option)
  nextTick(() => applyResponsive())
  return true
}

// 应用响应式补丁
function applyResponsive() {
  if (!chartPool.has(CHART_KEY) || !chartRef.value) return
  const instance = chartPool.get(CHART_KEY)
  if (!instance) return
  const width = chartRef.value.clientWidth
  const patch = getResponsivePatch(width, 'daily')
  instance.setOption(patch) // notMerge:false，合并覆盖而非替换
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  renderChart()
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartPool.resizeAll()
      applyResponsive()
    })
    resizeObserver.observe(chartRef.value)
  }
})

watch(
  resolvedOption,
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
