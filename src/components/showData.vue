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
        各项数据：
        <select v-model="index" @change="chooseData" style="margin-left: 200px">
          <option value="0">温度</option>
          <option value="1">云量/湿度</option>
          <option value="2">风速/风向</option>
          <option value="3">降水</option>
        </select>
      </div>

      <DowEcarts
        :weather-hours="nowWeather"
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
import { ref, watch, computed, onUnmounted, nextTick, toRaw } from 'vue'
import { request } from '@/utils/axios'
import { init, type ECharts } from '@/utils/echarts'
import type { EChartsOption } from 'echarts'
import 'qweather-icons/font/qweather-icons.css'
import DowEcarts from './nowEcarts.vue'
import { useCollect } from '@/stores/from'
const collectStore = useCollect()

const chartRef = ref<HTMLDivElement>()
let chartInstance: ECharts | null = null

const childRef = ref<InstanceType<typeof DowEcarts>>()
function child() {
  childRef.value?.handleClick()
}

function handleClick(e: boolean) {
  esist.value = e
}

defineExpose({
  handleClick,
})

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
let Citys = ['']
let Data = {}

// 数据获取
watch(
  () => props.citys,
  async (newVal) => {
    if (!newVal?.length) return

    const addresses = newVal.flatMap((item) => (typeof item === 'string' ? [item] : item))
    console.log('当前城市:', addresses)
    Data = {
      location: addresses,
    }
    collectStore.collectData(Data)
    nowWeathers.value = []
    dailys.value = []
    Citys = []

    await Promise.all(addresses.map((addr) => getCityCode(addr)))
    nowWeather.value = nowWeathers.value[currentCity.value] || ''
    console.log('当前天气:', nowWeather.value)
    daily.value = dailys.value[currentCity.value]
    idx.value = 0
    cityList.value = addresses
    const datas = dailys.value.map((item) => toRaw(item))
    const weathers = []
    for (let i = 0; i < Citys.length; i++) {
      const weather = {
        city: Citys[i],
        data: datas[i],
      }
      weathers.push(weather)
    }
    const data = {
      weather: weathers,
    }
    console.log(data)
    collectStore.collectData(data)

    // 数据准备好后，初始化图表
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
  await initChart()
}

function chooseData(e: any) {
  index.value = Number(e.target.value)
}

function chooseCity(e: any) {
  currentCity.value = Number(e.target.value)
  nowWeather.value = nowWeathers.value[currentCity.value] || ''
  daily.value = dailys.value[currentCity.value]
  idx.value = 0
  initChart()
}

// 计算配置
const chartConfig = computed(() => {
  if (idx.value === -1 || !daily.value.length) return null
  const date = daily.value.map((item: any) => item.fxDate)
  console.log(daily.value)
  if (idx.value === 0) {
    return {
      name: '温度 (°C)',
      name1: '最高温',
      name2: '最低温',
      data1: daily.value.map((i: any) => i.tempMax),
      data2: daily.value.map((i: any) => i.tempMin),
      color1: '#ff7c7c',
      color2: '#7cb5ff',
      date,
    }
  } else if (idx.value === 1) {
    return {
      name: '云量/湿度 (%)',
      name1: '云量',
      name2: '湿度',
      data1: daily.value.map((i: any) => i.cloud),
      data2: daily.value.map((i: any) => i.humidity),
      color1: '#ffd166',
      color2: '#06d6a0',
      date,
    }
  } else if (idx.value === 2) {
    return {
      name: '风速 (km/h)',
      name1: '昼风',
      name2: '夜风',
      data1: daily.value.map((i: any) => i.windSpeedDay),
      data2: daily.value.map((i: any) => i.windSpeedNight),
      color1: '#118ab2',
      color2: '#073b4c',
      date,
    }
  }
  return null
})

// 初始化图表（在数据准备好后调用）
const initChart = async () => {
  await nextTick()
  console.log(chartRef.value, chartConfig.value)
  if (!chartRef.value || !chartConfig.value) return

  // 如果已存在，先销毁
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }

  const cfg = chartConfig.value
  console.log(cfg)
  const option: EChartsOption = {
    grid: {
      left: '3%',
      right: '3%',
      bottom: '5%',
      top: '5%', // 减小上边距
      height: '130px', // 明确设置高度
    },
    xAxis: {
      type: 'category',
      data: cfg.date,
      axisLabel: { color: '#333' },
      axisLine: { lineStyle: { color: '#cccccc' } },
    },
    yAxis: {
      type: 'value',
      name: cfg.name,
      nameTextStyle: { color: '#ffffff' },
      axisLabel: { color: '#ffffff' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    },
    series: [
      {
        name: cfg.name1,
        type: 'line',
        data: cfg.data1,
        smooth: true,
        label: {
          show: true,
          position: 'top',
          color: cfg.color1,
          fontSize: 11,
          formatter: (params: any) => {
            if (cfg.name.includes('温度')) return `${params.value}°`
            if (cfg.name.includes('云量/湿度')) return `${params.value}%`
            if (cfg.name.includes('风速')) return `${params.value}km/h`
            return params.value
          },
        },
        itemStyle: { color: cfg.color1 },
      },
      {
        name: cfg.name2,
        type: 'line',
        data: cfg.data2,
        smooth: true,
        label: {
          show: true,
          position: 'bottom',
          color: cfg.color2,
          fontSize: 11,
          formatter: (params: any) => {
            if (cfg.name.includes('温度')) return `${params.value}°`
            if (cfg.name.includes('云量/湿度')) return `${params.value}%`
            if (cfg.name.includes('风速')) return `${params.value}km/h`
            return params.value
          },
        },
        itemStyle: { color: cfg.color2 },
      },
    ],
  }

  chartInstance = init(chartRef.value, option)
  window.addEventListener('resize', handleResize)
}

const handleResize = () => chartInstance?.resize()

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
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
