import type { EChartsOption } from 'echarts'

type ChartType = 'daily' | 'hourly' | 'compare'

const BREAKPOINTS = { sm: 300, md: 500, lg: 700 }

function getSize(width: number): 'sm' | 'md' | 'lg' | 'xl' {
  if (width < BREAKPOINTS.sm) return 'sm'
  if (width < BREAKPOINTS.md) return 'md'
  if (width < BREAKPOINTS.lg) return 'lg'
  return 'xl'
}

// 不同尺寸下的 grid 边距
const gridBySize = {
  sm: { top: '22%', bottom: '28%', left: '8%', right: '8%' },
  md: { top: '18%', bottom: '24%', left: '6%', right: '6%' },
  lg: { top: '15%', bottom: '20%', left: '5%', right: '5%' },
  xl: { top: '12%', bottom: '15%', left: '3%', right: '3%' },
}

// 不同尺寸下的字体
const fontSizeBySize = {
  sm: { label: 8, axis: 7, title: 0, legend: 8 },
  md: { label: 10, axis: 8, title: 10, legend: 9 },
  lg: { label: 11, axis: 9, title: 12, legend: 10 },
  xl: { label: 12, axis: 10, title: 14, legend: 11 },
}

/**
 * 根据容器宽度生成响应式补丁（用于 instance.setOption 合并）
 */
export function getResponsivePatch(
  containerWidth: number,
  chartType: ChartType,
): Partial<EChartsOption> {
  const size = getSize(containerWidth)
  const grid = gridBySize[size]
  const fonts = fontSizeBySize[size]

  const patch: any = {
    grid: { ...grid },
    xAxis: { axisLabel: { fontSize: fonts.axis } },
    yAxis: { axisLabel: { fontSize: fonts.axis } },
  }

  // 标题：小屏隐藏
  if (size === 'sm') {
    patch.title = { text: '', show: false }
  } else {
    patch.title = { textStyle: { fontSize: fonts.title } }
  }

  // 图例字体
  patch.legend = { textStyle: { fontSize: fonts.legend } }

  // 系列 label 字体（仅 daily 和 compare 有 label）
  if (chartType === 'daily' || chartType === 'compare') {
    patch.series = [
      { label: { fontSize: fonts.label } },
      { label: { fontSize: fonts.label } },
    ]
  }

  // 逐小时图表的小屏适配：加深底部边距给图例留空间
  if (chartType === 'hourly' && (size === 'sm' || size === 'md')) {
    patch.grid.bottom = size === 'sm' ? '30%' : '26%'
  }

  return patch
}
