// tileWorker.ts
self.onmessage = async (e: MessageEvent) => {
  const { urls, batchSize, delay } = e.data

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize)

    // 并发加载一批
    await Promise.all(
      batch.map((url) =>
        fetch(url)
          .then((res) => ({ url, success: res.ok, status: res.status }))
          .catch(() => ({ url, success: false, status: 0 })),
      ),
    )

    // 发送进度
    self.postMessage({
      type: 'progress',
      loaded: Math.min(i + batchSize, urls.length),
      total: urls.length,
      batch: batch.map((r) => r.url),
    })

    // 让出时间片
    if (i + batchSize < urls.length) {
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  self.postMessage({ type: 'complete' })
}
