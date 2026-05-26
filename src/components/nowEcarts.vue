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
import { request } from '@/utils/axios'
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue' // 新增nextTick
import { init, type ECharts } from '@/utils/echarts'
import type { EChartsOption } from 'echarts'

const props = defineProps<{
  weatherHours: string
  showChart: boolean
  showIdx: number
}>()

const Show = ref(false)
const tempChart = ref<HTMLDivElement>()
const cloudChart = ref<HTMLDivElement>()
const windChart = ref<HTMLDivElement>()
const popChart = ref<HTMLDivElement>()

let timer: number | null = null

// 修复：Show变化后立即重新初始化图表
const computedShow = computed(() => !props.showChart)
watch(
  computedShow,
  (val) => {
    console.log('Show updated:', val)
    Show.value = val
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      initCharts()
      timer = null
    }, 100)
  },
  { immediate: true },
)

// 图表实例存储
const chartInstances = new Map<string, ECharts>()

interface HourlyData {
  fxTimes: string[]
  temps: number[]
  dews: number[]
  clouds: number[]
  humiditys: number[]
  windSpeeds: number[]
  pops: number[]
  precips: number[]
  icons: string[]
  wind360s: number[]
}

const data = ref<HourlyData>({
  fxTimes: [],
  temps: [],
  dews: [],
  clouds: [],
  humiditys: [],
  windSpeeds: [],
  pops: [],
  precips: [],
  icons: [],
  wind360s: [],
})

// 图表配置定义
const chartConfigs = computed(() => [
  {
    ref: tempChart,
    key: 'temp',
    title: '温度 (°C)',
    series1: { name: '气温', key: 'temps', color: '#ff7c7c' },
    series2: { name: '露点', key: 'dews', color: '#7cb5ff' },
  },
  {
    ref: cloudChart,
    key: 'cloud',
    title: '云量/湿度 (%)',
    series1: { name: '云量', key: 'clouds', color: '#ffd166' },
    series2: { name: '湿度', key: 'humiditys', color: '#06d6a0' },
  },
  {
    ref: windChart,
    key: 'wind',
    title: '风速 (km/h)',
    series1: { name: '风速', key: 'windSpeeds', color: '#118ab2' },
    series2: { name: '风向', key: 'wind360s', color: '#073b4c' },
  },
  {
    ref: popChart,
    key: 'pop',
    title: '降水 (mm/%)',
    series1: { name: '降水概率', key: 'pops', color: '#ffd166' },
    series2: { name: '降水量', key: 'precips', color: '#06d6a0' },
  },
])

// 监听 weatherHours 变化
watch(
  () => props.weatherHours,
  async (newCity) => {
    console.log('新的城市编码：', newCity)
    if (!newCity) return

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    try {
      await getHourWeather(newCity)
      timer = setTimeout(() => {
        initCharts()
        timer = null
      }, 200)
    } catch (error) {
      console.error('获取小时天气数据失败：', error)
    }
  },
  { immediate: true },
)

// 修复：监听 showIdx 变化，重新初始化单图表
watch(
  () => props.showIdx,
  (val) => {
    console.log('showIdx updated:', val)
    if (Show.value) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        initCharts()
        timer = null
      }, 100)
    }
  },
  { immediate: true },
)

function handleClick() {
  console.log('11111', props)
}

defineExpose({
  handleClick,
})

async function getHourWeather(code: string) {
  const url = '/weather/hoursWeather'
  console.log('请求小时天气，编码：', code)

  try {
    const Data = await request(url, 'GET', { location: code })
    const hourly = Data?.data?.data?.hourly || []

    if (hourly.length === 0) {
      console.warn('小时天气数据为空')
      return
    }

    data.value = {
      fxTimes: [],
      temps: [],
      dews: [],
      clouds: [],
      humiditys: [],
      windSpeeds: [],
      pops: [],
      precips: [],
      icons: [],
      wind360s: [],
    }

    hourly.forEach((item: any) => {
      data.value.fxTimes.push(item.fxTime?.slice(11, 13) || '')
      data.value.temps.push(Number(item.temp) || 0)
      data.value.dews.push(Number(item.dew) || 0)
      data.value.clouds.push(Number(item.cloud) || 0)
      data.value.humiditys.push(Number(item.humidity) || 0)
      data.value.windSpeeds.push(Number(item.windSpeed) || 0)
      data.value.pops.push(Number(item.pop) || 0)
      data.value.precips.push(Number(item.precip) || 0)
      data.value.icons.push(item.icon || '')
      data.value.wind360s.push(Number(item.wind360) || 0)
    })
  } catch (error) {
    console.error('请求小时天气接口失败：', error)
  }
}

function generateChartOption(config: any): EChartsOption {
  const baseOption: any = {
    title: {
      text: config.title,
      textStyle: { color: getTitleColor(config.key), fontSize: 10 },
      left: 'center',
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.85)',
      borderColor: '#444',
      textStyle: { color: '#fff', fontSize: 11 },
      formatter: (params: any[]) => generateTooltip(params, config.key),
    },
    grid: {
      left: '5%',
      right: '5%',
      top: '15%',
      bottom: config.key === 'wind' || config.key === 'pop' ? '22%' : '18%',
    },
    legend: {
      data: [config.series1.name, config.series2.name],
      bottom: 0,
      textStyle: { color: '#cccccc', fontSize: 9 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: 'category',
      data: data.value.fxTimes,
      boundaryGap: config.key === 'pop',
      axisLabel: { color: '#ffffff', fontSize: 8 },
      axisLine: { lineStyle: { color: '#cccccc' } },
    },
  }

  switch (config.key) {
    case 'temp':
      return { ...baseOption, ...generateTempConfig(config) }
    case 'cloud':
      return { ...baseOption, ...generateCloudConfig(config) }
    case 'wind':
      return { ...baseOption, ...generateWindConfig(config) }
    case 'pop':
      return { ...baseOption, ...generatePopConfig(config) }
    default:
      return baseOption
  }
}

function getTitleColor(key: string): string {
  const colors: Record<string, string> = {
    temp: '#ff7c7c',
    cloud: '#ffd166',
    wind: '#118ab2',
    pop: '#06d6a0',
  }
  return colors[key] || '#fff'
}

function generateTooltip(params: any[], key: string): string {
  const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
  let html = `<div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #555;padding-bottom:3px">${params[0].axisValue}时</div>`

  params.forEach((item: any) => {
    let unit = ''
    let value = item.value

    if (key === 'temp') unit = '°C'
    else if (key === 'cloud') unit = '%'
    else if (key === 'wind') {
      if (item.seriesName.includes('速')) unit = 'km/h'
      else {
        const dirText = dirs[Math.round(Number(value) / 45) % 8]
        value = `${dirText} (${Math.round(Number(value))}°)`
        unit = ''
      }
    } else if (key === 'pop') {
      unit = item.seriesName.includes('概率') ? '%' : 'mm'
    }

    html += `
      <div style="display:flex;align-items:center;margin:4px 0;gap:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color}"></span>
        <span style="flex:1;font-size:11px">${item.seriesName}:</span>
        <span style="font-weight:bold;font-size:11px">${value}${unit}</span>
      </div>
    `
  })
  return html
}

function generateTempConfig(config: any) {
  return {
    yAxis: {
      type: 'value',
      name: '°C',
      nameTextStyle: { color: '#ffffff', fontSize: 8 },
      axisLabel: { color: '#ffffff', fontSize: 8 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [
      createLineSeries(config.series1, data.value.temps, true),
      createLineSeries(config.series2, data.value.dews, false),
    ],
  }
}

function generateCloudConfig(config: any) {
  return {
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      name: '%',
      nameTextStyle: { color: '#ffffff', fontSize: 8 },
      axisLabel: { color: '#ffffff', fontSize: 8, formatter: '{value}%' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [
      createAreaSeries(config.series1, data.value.clouds, 0.4, false),
      createAreaSeries(config.series2, data.value.humiditys, 0.4, false),
    ],
  }
}

function generateWindConfig(config: any) {
  return {
    yAxis: [
      {
        type: 'value',
        name: 'km/h',
        position: 'left',
        nameTextStyle: { color: '#118ab2', fontSize: 8 },
        axisLabel: { color: '#118ab2', fontSize: 8 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      {
        type: 'value',
        name: '风向',
        position: 'right',
        min: 0,
        max: 360,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        ...createLineSeries(config.series1, data.value.windSpeeds, true),
        yAxisIndex: 0,
      },
      {
        name: config.series2.name,
        type: 'scatter',
        yAxisIndex: 1,
        data: data.value.wind360s,
        symbol: 'path://M5,0 L10,10 L5,8 L0,10 Z',
        symbolRotate: (val: number) => val,
        symbolSize: 10,
        itemStyle: {
          color: config.series2.color,
          opacity: 0.8,
        },
        emphasis: {
          scale: 1.5,
          itemStyle: { borderWidth: 2, borderColor: '#fff' },
        },
      },
    ],
  }
}

function generatePopConfig(config: any) {
  return {
    yAxis: [
      {
        type: 'value',
        name: '%',
        position: 'left',
        min: 0,
        max: 100,
        nameTextStyle: { color: '#06d6a0', fontSize: 8 },
        axisLabel: { color: '#06d6a0', fontSize: 8, formatter: '{value}%' },
        splitLine: { show: false },
      },
      {
        type: 'value',
        name: 'mm',
        position: 'right',
        nameTextStyle: { color: '#ffd166', fontSize: 8 },
        axisLabel: { color: '#ffd166', fontSize: 8, formatter: '{value}mm' },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
    ],
    series: [
      {
        name: config.series1.name,
        type: 'line',
        yAxisIndex: 0,
        data: data.value.pops,
        smooth: true,
        lineStyle: {
          width: 2,
          type: 'dashed',
          color: config.series1.color,
        },
        areaStyle: {
          color: config.series1.color,
          opacity: 0.2,
        },
        itemStyle: { color: config.series1.color, opacity: 0 },
        emphasis: { itemStyle: { opacity: 1 } },
        symbol: 'none',
      },
      {
        name: config.series2.name,
        type: 'bar',
        yAxisIndex: 1,
        data: data.value.precips,
        barWidth: '50%',
        itemStyle: {
          color: (params: any) => {
            const val = Number(params.value)
            if (val === 0) return 'rgba(255,255,255,0.05)'
            if (val <= 5) return '#4cc9f0'
            if (val <= 20) return '#ffd166'
            return '#e63946'
          },
          borderRadius: [3, 3, 0, 0],
        },
      },
    ],
  }
}

function createLineSeries(
  seriesConfig: { name: string; color: string },
  data: number[],
  isTop: boolean,
) {
  return {
    name: seriesConfig.name,
    type: 'line',
    data,
    smooth: true,
    lineStyle: { width: 2, color: seriesConfig.color },
    areaStyle: {
      color: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: seriesConfig.color + '60' },
          { offset: 1, color: seriesConfig.color + '00' },
        ],
      },
    },
    itemStyle: { color: seriesConfig.color },
    symbol: 'circle',
    symbolSize: 4,
    emphasis: {
      focus: 'series',
      itemStyle: { borderWidth: 2, borderColor: '#fff', scale: 1.5 },
    },
  }
}

function createAreaSeries(
  seriesConfig: { name: string; color: string },
  data: number[],
  opacity: number,
  showSymbol: boolean = false,
) {
  return {
    name: seriesConfig.name,
    type: 'line',
    data,
    smooth: true,
    symbol: showSymbol ? 'circle' : 'none',
    lineStyle: { width: 1, color: seriesConfig.color },
    areaStyle: {
      color: seriesConfig.color,
      opacity,
    },
    itemStyle: { color: seriesConfig.color },
    emphasis: {
      focus: 'series',
      itemStyle: { opacity: 1 },
    },
  }
}

// 核心修复：区分单/多图表模式，只初始化当前显示的图表
function initCharts() {
  console.log('初始化图表，数据：', data.value, 'Show:', Show.value, 'showIdx:', props.showIdx)

  // 先销毁所有旧实例，避免重叠
  chartInstances.forEach((instance) => instance.dispose())
  chartInstances.clear()

  if (Show.value) {
    // 单图表模式：只初始化当前showIdx对应的图表
    const currentConfig = chartConfigs.value[props.showIdx]
    if (!currentConfig) return

    const dom = currentConfig.ref.value
    if (!dom) return

    const instance = init(dom)
    chartInstances.set(currentConfig.key, instance)
    instance.setOption(generateChartOption(currentConfig), true)
    // 强制刷新尺寸，确保图表适配容器
    instance.resize()
  } else {
    // 多图表模式：初始化所有图表
    chartConfigs.value.forEach((config) => {
      const dom = config.ref.value
      if (!dom) return

      const instance = init(dom)
      chartInstances.set(config.key, instance)
      instance.setOption(generateChartOption(config), true)
    })
  }
}

// 响应式处理
const handleResize = () => {
  chartInstances.forEach((instance) => instance.resize())
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (timer) clearTimeout(timer)
  chartInstances.forEach((instance) => instance.dispose())
  chartInstances.clear()
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
