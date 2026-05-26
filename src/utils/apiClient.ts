import { request } from './axios'
import type { EChartsOption } from 'echarts'

export interface ChartConfigRequest {
  chartType: 'daily' | 'hourly' | 'compare'
  city: string
  seriesType: 'temp' | 'cloud' | 'wind' | 'pop'
}

export interface ChartConfigResponse {
  chartType: string
  city: string
  seriesType: string
  option: EChartsOption
}

/** 获取服务端生成的图表配置 */
export async function fetchChartConfig(params: ChartConfigRequest): Promise<ChartConfigResponse> {
  const res = await request('/api/chart/config', 'POST', params)
  console.log('Received chart config:', res.data)
  return res.data
}

/** 获取聚合天气数据（实况 + 7天 + 24h 一次调用） */
export async function fetchAggregateWeather(city: string) {
  const res = await request('/weather/aggregate', 'GET', { location: city })
  return res.data
}
