import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'

export function init(dom: HTMLElement, option?: EChartsOption) {
  const chart = echarts.init(dom)
  if (option) chart.setOption(option)
  return chart
}

export type { ECharts, EChartsOption }
