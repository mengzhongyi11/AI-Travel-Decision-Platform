<template>
  <div v-if="!Show" class="box">
    <div class="card">
      <div ref="tempChart" class="box-card"></div>
      <div ref="cloudChart" class="box-card"></div>
    </div>
    <div class="m-card"></div>
    <div class="card">
      <div ref="windChart" class="box-card"></div>
      <div ref="popChart" class="box-card"></div>
    </div>
  </div>

  <div v-if="Show" class="box-single">
    <div v-show="props.showIdx === 0" ref="tempChart" class="box-singlecard"></div>
    <div v-show="props.showIdx === 1" ref="cloudChart" class="box-singlecard"></div>
    <div v-show="props.showIdx === 2" ref="windChart" class="box-singlecard"></div>
    <div v-show="props.showIdx === 3" ref="popChart" class="box-singlecard"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import type { Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import type { ChartSchema } from '@/types/chartSchema'
import { chartPool } from '@/utils/chartPool'
import { patchTooltipFormatter, patchWindScatter } from '@/utils/tooltipPatcher'
import { getResponsivePatch } from '@/utils/chartResponsive'
import { schemaToOption } from '@/utils/schemaRenderer'

const props = defineProps<{
  chartOptions: Record<string, EChartsOption | null>
  schemaOptions?: Record<string, ChartSchema | null>
  showChart: boolean
  showIdx: number
}>()

const Show = ref(false)
const tempChart = ref<HTMLDivElement>()
const cloudChart = ref<HTMLDivElement>()
const windChart = ref<HTMLDivElement>()
const popChart = ref<HTMLDivElement>()

let timer: ReturnType<typeof setTimeout> | null = null

// chartKey -> DOM ref 映射
const chartRefMap: Record<string, Ref<HTMLDivElement | undefined>> = {
  temp: tempChart,
  cloud: cloudChart,
  wind: windChart,
  pop: popChart,
}

const chartKeys = ['temp', 'cloud', 'wind', 'pop'] as const

// schema 优先，自动转为 option
const resolvedOptions = computed(() => {
  const opts: Record<string, EChartsOption | null> = {}
  chartKeys.forEach((key) => {
    if (props.schemaOptions?.[key]) {
      opts[key] = schemaToOption(props.schemaOptions[key]!, key)
    } else {
      opts[key] = props.chartOptions[key] || null
    }
  })
  return opts
})

// Show 模式切换
const computedShow = computed(() => !props.showChart)
watch(
  computedShow,
  (val) => {
    Show.value = val
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => initCharts(), 100)
  },
  { immediate: true },
)

// showIdx 切换时重绘
watch(
  () => props.showIdx,
  () => {
    if (Show.value) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => initCharts(), 100)
    }
  },
  { immediate: true },
)

// chartOptions / schemaOptions 变化时更新
watch(
  resolvedOptions,
  (opts) => {
    if (Object.keys(opts).length === 0) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => initCharts(), 100)
  },
  { deep: true },
)

function getChartKey(seriesType: string): string {
  return `hourly-${seriesType}`
}

function initCharts() {
  // 多图表模式：初始化所有图表
  if (!Show.value) {
    chartKeys.forEach((key) => {
      const dom = chartRefMap[key]?.value
      const option = resolvedOptions.value[key]
      if (!dom || !option) return

      const instance = chartPool.acquire(getChartKey(key), dom)
      instance.setOption(option, true)
      instance.resize()
    })
    applyHourlyResponsive()
    return
  }

  // 单图表模式：只显示当前 showIdx
  const currentKey = chartKeys[props.showIdx]
  if (!currentKey) return

  const dom = chartRefMap[currentKey]?.value
  const option = resolvedOptions.value[currentKey]
  if (!dom || !option) return

  const instance = chartPool.acquire(getChartKey(currentKey), dom)
  instance.setOption(option, true)
  instance.resize()
  applyHourlyResponsive()
}

// 为所有逐小时图表应用响应式补丁
function applyHourlyResponsive() {
  const dom = tempChart.value || cloudChart.value || windChart.value || popChart.value
  if (!dom) return
  const width = dom.clientWidth
  chartKeys.forEach((key) => {
    const instance = chartPool.get(getChartKey(key))
    if (instance) {
      const patch = getResponsivePatch(width, 'hourly')
      instance.setOption(patch)
    }
  })
}

let resizeObserver: ResizeObserver | null = null

function handleClick() {
  console.log('nowEcarts showIdx:', props.showIdx)
}

defineExpose({ handleClick })

onMounted(() => {
  // 用 ResizeObserver 监听容器尺寸变化
  const doms = [tempChart, cloudChart, windChart, popChart]
  const firstDom = doms.find((r) => r.value)
  if (firstDom?.value) {
    resizeObserver = new ResizeObserver(() => {
      chartPool.resizeAll()
      applyHourlyResponsive()
    })
    resizeObserver.observe(firstDom.value)
  }
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (timer) clearTimeout(timer)
  chartKeys.forEach((key) => chartPool.release(getChartKey(key)))
})
</script>

<style scoped>
.box {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: row;
  border: 1px solid #fff;
}

.card {
  width: 37%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.m-card {
  width: 26%;
  height: 100%;
  display: flex;
}

.box-card {
  width: 100%;
  height: 50%;
  display: flex;
  transition: transform 0.5s ease;
  min-width: 150px;
  min-height: 80px;
}

.box > .card:first-child .box-card:first-child:hover {
  transform: scale(1.6) translateX(100px) translateY(45px);
}

.box > .card:first-child .box-card:last-child:hover {
  transform: scale(1.6) translateX(100px) translateY(-45px);
}

.box > .card:last-child .box-card:first-child:hover {
  transform: scale(1.6) translateX(-100px) translateY(45px);
}

.box > .card:last-child .box-card:last-child:hover {
  transform: scale(1.6) translateX(-100px) translateY(-45px);
}

.box-single {
  width: 100%;
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.box-singlecard {
  width: 100%;
  height: 100%;
  min-width: 300px;
  min-height: 170px;
}
</style>
