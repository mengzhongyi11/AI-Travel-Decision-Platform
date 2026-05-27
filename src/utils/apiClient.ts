import { request } from './axios'
import type { EChartsOption } from 'echarts'
import type { ChartSchema } from '@/types/chartSchema'

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

export interface ChartSchemaResponse {
  chartType: string
  city: string
  seriesType: string
  schema: ChartSchema
}

/** 获取服务端生成的图表配置（ECharts option） */
export async function fetchChartConfig(params: ChartConfigRequest): Promise<ChartConfigResponse> {
  const res = await request('/api/chart/config', 'POST', params)
  return res.data
}

/** 获取服务端生成的图表 Schema（语义层数据描述） */
export async function fetchChartSchema(params: ChartConfigRequest): Promise<ChartSchemaResponse> {
  const res = await request('/api/chart/schema', 'POST', params)
  return res.data
}

/** 获取聚合天气数据（实况 + 7天 + 24h 一次调用） */
export async function fetchAggregateWeather(city: string) {
  const res = await request('/weather/aggregate', 'GET', { location: city })
  return res.data
}
