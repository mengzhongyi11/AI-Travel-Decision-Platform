import type { useChartStore } from '@/stores/charts'

const BASE_URL = 'http://localhost:3001'

/**
 * 连接 SSE 并自动将推送数据写入 Pinia store
 * 返回 disconnect 函数
 *
 * 注意：每次连接前应先 disconnect 旧连接，避免多路 SSE 重叠
 */
export function connectSSE(city: string, store: ReturnType<typeof useChartStore>): () => void {
  const url = `${BASE_URL}/api/stream?city=${encodeURIComponent(city)}`
  const eventSource = new EventSource(url)

  let closed = false

  eventSource.addEventListener('chartUpdate', (event: MessageEvent) => {
    if (closed) return
    try {
      const data = JSON.parse(event.data)
      if (data.chartType === 'daily') {
        store.setDailyOption(data.seriesType, data.option)
      } else if (data.chartType === 'hourly') {
        store.setHourlyOption(data.seriesType, data.option)
      }
    } catch (e) {
      console.error('SSE chartUpdate parse error:', e)
    }
  })

  eventSource.addEventListener('nowUpdate', (event: MessageEvent) => {
    if (closed) return
    try {
      const data = JSON.parse(event.data)
      store.setNowWeather(data.now)
    } catch (e) {
      console.error('SSE nowUpdate parse error:', e)
    }
  })

  eventSource.addEventListener('error', (event) => {
    console.error('❌ SSE 连接错误:', event)
    store.setConnected(false)
    // EventSource 内置自动重连0
  })

  // 监听服务端推送的业务错误事件
  eventSource.addEventListener('serverError', (event: MessageEvent) => {
    console.error('❌ SSE 服务端错误:', event.data)
  })

  eventSource.onopen = () => {
    console.log('✅ SSE 已连接:', city)
    if (!closed) store.setConnected(true)
  }

  return () => {
    closed = true
    eventSource.close()
    store.setConnected(false)
  }
}
