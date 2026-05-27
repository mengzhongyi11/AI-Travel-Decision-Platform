import type { EChartsOption } from 'echarts'
import type { ChartSchema } from '@/types/chartSchema'

const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

/** 将 ChartSchema 转为完整 EChartsOption（含 function 字段） */
export function schemaToOption(schema: ChartSchema, chartKey?: string): EChartsOption {
  const option: any = {
    tooltip: buildTooltip(schema, chartKey),
    legend: { data: schema.series.map((s) => s.name), selectedMode: 'multiple', textStyle: { color: '#cccccc' } },
    grid: { left: '5%', right: '5%', top: '15%', bottom: '18%' },
    xAxis: {
      type: 'category',
      data: schema.xAxis.data,
      axisLabel: { color: '#ffffff', fontSize: 8 },
      axisLine: { lineStyle: { color: '#cccccc' } },
    },
  }

  if (schema.title) {
    option.title = { text: schema.title, textStyle: { color: '#cccccc', fontSize: 10 }, left: 'center' }
  }

  // Y 轴
  if (schema.yAxis && schema.yAxis.length > 0) {
    option.yAxis = schema.yAxis.map((y, i) => ({
      type: 'value',
      name: y.name,
      position: y.position || (i === 0 ? 'left' : 'right'),
      min: y.min,
      max: y.max,
      nameTextStyle: { color: '#ffffff', fontSize: 8 },
      axisLabel: { color: '#ffffff', fontSize: 8 },
      splitLine: i === 0 ? { lineStyle: { color: 'rgba(255,255,255,0.1)' } } : { show: false },
    }))
  } else {
    option.yAxis = {
      type: 'value',
      nameTextStyle: { color: '#ffffff', fontSize: 8 },
      axisLabel: { color: '#ffffff', fontSize: 8 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
    }
  }

  // 系列
  option.series = schema.series.map((s, i) => buildSeries(s, i, schema.yAxis?.length || 0))

  return option as EChartsOption
}

function buildTooltip(schema: ChartSchema, chartKey?: string): any {
  return {
    trigger: 'axis',
    triggerOn: 'mousemove|click',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderColor: '#444',
    textStyle: { color: '#fff', fontSize: 11 },
    formatter: (params: any[]) => {
      if (!params?.length) return ''
      let html = `<div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #555;padding-bottom:3px">${params[0].axisValue}${chartKey === 'daily' || chartKey === 'compare' ? '' : '时'}</div>`
      params.forEach((item: any) => {
        const seriesSchema = schema.series.find((s) => s.name === item.seriesName)
        let display = item.value
        let unit = seriesSchema?.unit || ''
        if (chartKey === 'wind' && seriesSchema?.style === 'scatter' && unit === '°') {
          const dirText = DIRS[Math.round(Number(item.value) / 45) % 8]
          display = `${dirText} (${Math.round(Number(item.value))}°)`
          unit = ''
        }
        html += `<div style="display:flex;align-items:center;margin:4px 0;gap:8px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color}"></span><span style="flex:1;font-size:11px">${item.seriesName}:</span><span style="font-weight:bold;font-size:11px">${display}${unit}</span></div>`
      })
      return html
    },
  }
}

function buildSeries(s: ChartSchema['series'][0], index: number, yAxisCount: number) {
  const base: any = {
    name: s.name,
    yAxisIndex: s.yAxisIndex ?? (index === 0 ? 0 : yAxisCount > 1 ? Math.min(index, yAxisCount - 1) : 0),
  }

  switch (s.style) {
    case 'line':
      return {
        ...base,
        type: 'line',
        data: s.data,
        smooth: true,
        lineStyle: { width: 2, color: s.color, ...(s.dashed ? { type: 'dashed' as const } : {}) },
        itemStyle: { color: s.color, ...(s.dashed ? { opacity: 0 } : {}) },
        emphasis: { itemStyle: { borderWidth: 2, borderColor: '#fff' } },
        symbol: s.dashed ? 'none' : 'circle',
        symbolSize: 4,
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color + '60' },
              { offset: 1, color: s.color + '00' },
            ],
          },
        },
      }

    case 'area':
      return {
        ...base,
        type: 'line',
        data: s.data,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1, color: s.color },
        areaStyle: { color: s.color, opacity: s.areaOpacity ?? 0.4 },
        itemStyle: { color: s.color },
        emphasis: { focus: 'series' as const, itemStyle: { opacity: 1 } },
      }

    case 'bar':
      return {
        ...base,
        type: 'bar',
        data: s.data.map((v) => {
          let color = 'rgba(255,255,255,0.05)'
          if (v > 0 && v <= 5) color = '#4cc9f0'
          else if (v <= 20) color = '#ffd166'
          else if (v > 20) color = '#e63946'
          return { value: v, itemStyle: { color, borderRadius: [3, 3, 0, 0] as [number, number, number, number] } }
        }),
        barWidth: '50%',
      }

    case 'scatter':
      return {
        ...base,
        type: 'scatter',
        data: s.data,
        symbol: s.scatterSymbol || 'path://M5,0 L10,10 L5,8 L0,10 Z',
        symbolSize: 10,
        symbolRotate: (val: number) => val,
        itemStyle: { color: s.color, opacity: 0.8 },
        emphasis: { scale: 1.5, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
      }
  }
}
