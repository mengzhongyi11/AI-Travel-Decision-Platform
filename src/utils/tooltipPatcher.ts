import type { EChartsOption } from 'echarts'

const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']

/**
 * 为从服务端接收的 chart option 注入 tooltip formatter function
 * （function 不可 JSON 序列化，需在客户端注入）
 */
export function patchTooltipFormatter(option: EChartsOption, chartKey: string): EChartsOption {
  ;(option as any).tooltip = {
    trigger: 'axis',
    triggerOn: 'mousemove|click',
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderColor: '#444',
    textStyle: { color: '#fff', fontSize: 11 },
    formatter: (params: any[]) => {
      if (!params?.length) return ''
      let html = `<div style="font-weight:bold;margin-bottom:5px;border-bottom:1px solid #555;padding-bottom:3px">${params[0].axisValue}时</div>`
      params.forEach((item: any) => {
        let unit = ''
        let value = item.value
        if (chartKey === 'temp') unit = '°C'
        else if (chartKey === 'cloud') unit = '%'
        else if (chartKey === 'wind') {
          if (item.seriesName?.includes('速')) unit = 'km/h'
          else {
            const dirText = DIRS[Math.round(Number(value) / 45) % 8]
            value = `${dirText} (${Math.round(Number(value))}°)`
          }
        } else if (chartKey === 'pop') {
          unit = item.seriesName?.includes('概率') ? '%' : 'mm'
        }
        html += `<div style="display:flex;align-items:center;margin:4px 0;gap:8px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color}"></span><span style="flex:1;font-size:11px">${item.seriesName}:</span><span style="font-weight:bold;font-size:11px">${value}${unit}</span></div>`
      })
      return html
    },
  }
  return option
}

/** 为风向散点图注入 symbolRotate 回调 */
export function patchWindScatter(option: EChartsOption): EChartsOption {
  if (option.series && Array.isArray(option.series)) {
    const scatter = option.series.find((s: any) => s.type === 'scatter')
    if (scatter) {
      ;(scatter as any).symbolRotate = (val: number) => val
    }
  }
  return option
}
