<template>
  <div class="city-head">
    当前城市：
    <select v-model="currentCity" @change="chooseCity" style="margin-left: 200px; min-width: 17%">
      <option v-for="value in cityList" :value="cityList.indexOf(value)">{{ value }}</option>
    </select>
  </div>
  <div class="day">
    <div class="day-head">
      <div class="choose">
        七天预报：
        <select v-model="idx" @change="choose" style="margin-left: 200px">
          <option value="0">温度</option>
          <option value="1">云量/湿度</option>
          <option value="2">风速</option>
        </select>
      </div>
      <div v-if="esist" ref="chartRef" class="box-card"></div>
      <div v-if="esist" class="box-weather">
        <div v-for="(item, key) in daily">
          <div>
            <i :class="'qi-' + item?.iconDay" class="weather-icon"></i>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="day">
    <div class="every-data" @click="child">
      <div class="choose">
        实时数据：
        <select v-model="index" @change="chooseData" style="margin-left: 200px">
          <option value="0">温度</option>
          <option value="1">云量/湿度</option>
          <option value="2">风速/风向</option>
          <option value="3">降水</option>
        </select>
      </div>

      <DowEcarts
        :chart-options="hourlyChartOptions"
        :schema-options="hourlySchemaOptions"
        :show-chart="show"
        :show-idx="index"
        :style="{ width: 100 + '%', height: 90 + '%' }"
        ref="childRef"
        v-if="esist"
      >
      </DowEcarts>
    </div>
  </div>
  <div class="day">
    <div class="special">特殊情况：</div>
  </div>
  <div class="day">
    <div class="suggestion">当前建议：</div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, onUnmounted, nextTick, toRaw } from 'vue'
import type { EChartsOption } from 'echarts'
import type { ChartSchema } from '@/types/chartSchema'
import { chartPool } from '@/utils/chartPool'
import { fetchChartSchema } from '@/utils/apiClient'
import { schemaToOption } from '@/utils/schemaRenderer'
import { getResponsivePatch } from '@/utils/chartResponsive'
import 'qweather-icons/font/qweather-icons.css'
import DowEcarts from './nowEcarts.vue'
import { useCollect } from '@/stores/from'
import { request } from '@/utils/axios'

const collectStore = useCollect()

const chartRef = ref<HTMLDivElement>()
const childRef = ref<{ handleClick: () => void }>()

const hourlyChartOptions = ref<Record<string, EChartsOption>>({})
const hourlySchemaOptions = ref<Record<string, ChartSchema | null>>({})
const dailyChartOption = ref<EChartsOption | null>(null)

// 由 showMap.vue 调用
function child() {
  childRef.value?.handleClick()
}

function handleClick(e: boolean) {
  esist.value = e
}

defineExpose({ handleClick })

const props = defineProps<{
  citys: Array<string | string[]>
}>()

const idx = ref(-1)
const currentCity = ref(0)
const dailys = ref<any[]>([])
const daily = ref<any[]>([])
const nowWeather = ref('')
const nowWeathers = ref<any[]>([])
const show = ref(false)
const index = ref(0)
const esist = ref(false)
const cityList = ref<string[]>([])
const Citys = ['']
let Data = {}

const SERIES_MAP = ['temp', 'cloud', 'wind', 'pop'] as const
const DAILY_MAP = ['temp', 'cloud', 'wind'] as const

// 数据获取
watch(
  () => props.citys,
  async (newVal) => {
    if (!newVal?.length) return

    const addresses = newVal.flatMap((item) => (typeof item === 'string' ? [item] : item))
    Data = { location: addresses }
    collectStore.collectData(Data)
    nowWeathers.value = []
    dailys.value = []
    hourlyChartOptions.value = {}

    // 获取城市代码 + 原始天气数据（用于 AI context）
    await Promise.all(addresses.map((addr) => getCityCode(addr)))
    nowWeather.value = nowWeathers.value[currentCity.value] || ''

    // 获取服务端生成的图表配置
    const primaryCity = addresses[0]
    if (primaryCity) {
      // 获取 7 天图表配置（schema 优先）
      const dailyOpts = await Promise.all(
        DAILY_MAP.map((st) =>
          fetchChartSchema({ chartType: 'daily', city: primaryCity, seriesType: st }).catch(
            () => null,
          ),
        ),
      )
      dailyChartOption.value = dailyOpts[0] ? schemaToOption(dailyOpts[0].schema, 'daily') : null

      // 获取逐小时图表配置（schema 优先）
      const hourlyOpts = await Promise.all(
        SERIES_MAP.map((st) =>
          fetchChartSchema({ chartType: 'hourly', city: primaryCity, seriesType: st })
            .then((r) => ({ key: st, schema: r.schema }))
            .catch(() => null),
        ),
      )
      const opts: Record<string, EChartsOption> = {}
      const schemaOpts: Record<string, ChartSchema | null> = {}
      hourlyOpts.forEach((r) => {
        if (r) {
          opts[r.key] = schemaToOption(r.schema, r.key)
          schemaOpts[r.key] = r.schema
        }
      })
      hourlyChartOptions.value = opts
      hourlySchemaOptions.value = schemaOpts
    }

    daily.value = dailys.value[currentCity.value]
    idx.value = 0
    cityList.value = addresses

    // 收集 AI context
    const datas = dailys.value.map((item) => toRaw(item))
    const weathers = []
    for (let i = 0; i < Citys.length; i++) {
      weathers.push({ city: Citys[i], data: datas[i] })
    }
    collectStore.collectData({ weather: weathers })

    initChart()
  },
  { immediate: true },
)

async function getCityCode(address: string) {
  Citys.push(address)
  const res = await request('/weather/cityCode', 'GET', { locationCode: address })
  nowWeathers.value.push(res.data.data)
  await getNexttimeWeather(res.data.data)
}

async function getNexttimeWeather(code: string) {
  const res = await request('/weather/EvenDayWeather', 'GET', { location: code })
  const restDays = res.data.data.daily
  restDays.forEach((item: any) => (item.fxDate = item.fxDate.slice(8)))
  dailys.value.push(restDays)
}

async function choose(e: any) {
  idx.value = Number(e.target.value)
  await fetchDailyOption()
  await initChart()
}

async function chooseData(e: any) {
  index.value = Number(e.target.value)
}

async function chooseCity(e: any) {
  currentCity.value = Number(e.target.value)
  nowWeather.value = nowWeathers.value[currentCity.value] || ''
  daily.value = dailys.value[currentCity.value]
  idx.value = 0
  await fetchDailyOption()
  await fetchHourlyOptions()
  initChart()
}

// 获取当前选中城市的逐小时图表配置
async function fetchHourlyOptions() {
  const city = cityList.value[currentCity.value]
  if (!city) return
  const opts: Record<string, EChartsOption> = {}
  const results = await Promise.all(
    SERIES_MAP.map((st) =>
      fetchChartSchema({ chartType: 'hourly', city, seriesType: st })
        .then((r) => ({ key: st, schema: r.schema }))
        .catch(() => null),
    ),
  )
  const schemaOpts: Record<string, ChartSchema | null> = {}
  results.forEach((r) => {
    if (r) {
      opts[r.key] = schemaToOption(r.schema, r.key)
      schemaOpts[r.key] = r.schema
    }
  })
  hourlyChartOptions.value = opts
  hourlySchemaOptions.value = schemaOpts
}

// 从服务端获取当前选中城市的 7 天图表配置
async function fetchDailyOption() {
  const city = cityList.value[currentCity.value]
  if (!city) return
  const st = DAILY_MAP[idx.value] || 'temp'
  try {
    const res = await fetchChartSchema({ chartType: 'daily', city, seriesType: st })
    dailyChartOption.value = schemaToOption(res.schema, 'daily')
  } catch {
    dailyChartOption.value = null
  }
}

function applyShowDataResponsive() {
  const instance = chartPool.get('showdata-daily')
  if (!instance || !chartRef.value) return
  const width = chartRef.value.clientWidth
  const patch = getResponsivePatch(width, 'compare')
  instance.setOption(patch)
}

let resizeObserver: ResizeObserver | null = null

const initChart = async () => {
  await nextTick()
  if (!chartRef.value || !dailyChartOption.value) return

  const CHART_KEY = 'showdata-daily'
  const instance = chartPool.acquire(CHART_KEY, chartRef.value)
  instance.setOption(dailyChartOption.value, true)

  // 应用响应式补丁
  applyShowDataResponsive()

  // 首次渲染后启动 ResizeObserver
  if (!resizeObserver && chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartPool.resizeAll()
      applyShowDataResponsive()
    })
    resizeObserver.observe(chartRef.value)
  }
}

const chartKeys = ['temp', 'cloud', 'wind', 'pop']

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  chartPool.release('showdata-daily')
  chartKeys.forEach((k) => chartPool.release(`hourly-${k}`))
})
</script>

<style scoped>
.city-head {
  font-size: 15px;
  font-weight: bold;
  margin: 10px;
}

.day {
  width: auto;
  height: 180px;
}

.day-head {
  font-size: 13px;
  font-weight: bold;
  margin: 6px;
  height: 100%;
  position: relative;
}

.every-data,
.special,
.suggestion {
  font-size: 13px;
  font-weight: bold;
  margin: 6px;
}

.choose {
  width: 100%;
  height: 20px;
}

.box-card {
  width: 100%;
  height: 70%;
}

.box-weather {
  width: 90%;
  height: 20%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  margin-left: 27px;
}
</style>
