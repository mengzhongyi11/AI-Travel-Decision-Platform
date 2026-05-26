<template>
  <div ref="chartRef" class="box-card"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { init, type ECharts } from '@/utils/echarts'
import type { EChartsOption } from 'echarts'

// 先声明 ref（DOM 引用）
const chartRef = ref<HTMLDivElement>()
// 图表实例（普通变量即可，无需响应式）
let chartInstance: ECharts | null = null

interface WeatherData {
  date: string[]
  tempMax: number[]
  tempMin: number[]
  cloud: number[]
  humidity: number[]
  windSpeedDay: number[]
  windSpeedNight: number[]
}

const props = defineProps<{
  weatherData?: WeatherData
}>()

// 计算当前应该显示的数据配置
const chartConfig = computed(() => {
  const data = props.weatherData
  console.log(data)
  if (!data) return null

  // 根据数据类型返回对应配置
  if (data.tempMax && data.tempMax.length > 0) {
    return {
      name: '温度 (°C)',
      name1: '最高温',
      name2: '最低温',
      data1: data.tempMax,
      data2: data.tempMin,
      color1: '#ff7c7c',
      color2: '#7cb5ff',
    }
  } else if (data.cloud && data.cloud.length > 0) {
    return {
      name: '云量/湿度 (%)',
      name1: '云量',
      name2: '湿度',
      data1: data.cloud,
      data2: data.humidity,
      color1: '#ffd166',
      color2: '#06d6a0',
    }
  } else if (data.windSpeedDay && data.windSpeedDay.length > 0) {
    return {
      name: '风速 (km/h)',
      name1: '昼风',
      name2: '夜风',
      data1: data.windSpeedDay,
      data2: data.windSpeedNight,
      color1: '#118ab2',
      color2: '#073b4c',
    }
  }
  return null
})

// 初始化
onMounted(() => {
  if (!chartRef.value || !chartConfig.value) return

  const cfg = chartConfig.value

  const option: EChartsOption = {
    title: {
      text: '每日天气数据',
      textStyle: { color: '#ff7c7c', fontSize: 18, fontWeight: 'bold' },
    },
    legend: {
      data: [cfg.name1, cfg.name2], // 动态图例
      textStyle: { color: '#cccccc' },
    },
    xAxis: {
      type: 'category',
      data: props.weatherData?.date || [],
      axisLabel: { color: '#ffffff' },
      axisLine: { lineStyle: { color: '#cccccc' } },
    },
    yAxis: {
      type: 'value',
      name: cfg.name, // 动态单位
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
          color: cfg.color1, // 与线条同色
          fontSize: 11,
          formatter: (params: any) => {
            // 根据数据类型显示不同单位
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
          position: 'bottom', // 第二组放底部避免重叠
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
})

// 监听变化（自动处理所有数据类型）
watch(
  () => props.weatherData,
  (newData) => {
    if (chartInstance && newData && chartConfig.value) {
      const cfg = chartConfig.value

      chartInstance.setOption({
        yAxis: { name: cfg.name }, // 更新坐标轴名称
        legend: { data: [cfg.name1, cfg.name2] }, // 更新图例
        series: [
          {
            name: cfg.name1,
            data: cfg.data1,
            label: {
              show: true,
              position: 'top',
              color: cfg.color1, // 与线条同色
              fontSize: 11,
              formatter: (params: any) => {
                // 根据数据类型显示不同单位
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
            data: cfg.data2,
            label: {
              show: true,
              position: 'bottom', // 第二组放底部避免重叠
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
      })
    }
  },
  {
    deep: true,
    immediate: true, // 组件加载时立即执行一次
    flush: 'post', // 在 DOM 更新后执行，确保图表已渲染
  },
)

// 清理工作
const handleResize = () => {
  chartInstance?.resize()
}
</script>

<style scoped>
.box-card {
  width: 100%;
}
</style>
