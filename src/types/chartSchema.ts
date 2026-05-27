/** 单条数据系列的描述 */
export interface SeriesSchema {
  name: string
  data: number[]
  style: 'line' | 'area' | 'bar' | 'scatter'
  color: string
  unit?: string
  yAxisIndex?: number
  areaOpacity?: number
  dashed?: boolean
  scatterSymbol?: string
}

/** 服务端返回的图表数据描述（非 ECharts option，而是语义层 schema） */
export interface ChartSchema {
  title?: string
  xAxis: { data: string[] }
  series: SeriesSchema[]
  yAxis?: Array<{
    name?: string
    position?: 'left' | 'right'
    min?: number
    max?: number
  }>
}
