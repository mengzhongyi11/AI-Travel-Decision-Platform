import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { EChartsOption } from 'echarts'

export const useChartStore = defineStore('charts', () => {
  const dailyOptions = ref<Record<string, EChartsOption>>({})
  const hourlyOptions = ref<Record<string, EChartsOption>>({})
  const nowWeather = ref<any>(null)
  const lastUpdate = ref(0)
  const connected = ref(false)

  function setDailyOption(seriesType: string, option: EChartsOption) {
    dailyOptions.value = { ...dailyOptions.value, [seriesType]: option }
    lastUpdate.value = Date.now()
  }

  function setHourlyOption(seriesType: string, option: EChartsOption) {
    hourlyOptions.value = { ...hourlyOptions.value, [seriesType]: option }
    lastUpdate.value = Date.now()
  }

  function setNowWeather(data: any) {
    nowWeather.value = data
  }

  function setConnected(val: boolean) {
    connected.value = val
  }

  function reset() {
    dailyOptions.value = {}
    hourlyOptions.value = {}
    nowWeather.value = null
    connected.value = false
  }

  return {
    dailyOptions,
    hourlyOptions,
    nowWeather,
    lastUpdate,
    connected,
    setDailyOption,
    setHourlyOption,
    setNowWeather,
    setConnected,
    reset,
  }
})
