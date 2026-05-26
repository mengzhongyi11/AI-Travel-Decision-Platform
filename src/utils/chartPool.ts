import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'

class ChartInstancePool {
  private instances = new Map<string, ECharts>()

  /** 获取实例，不存在则创建 */
  acquire(key: string, dom: HTMLElement): ECharts {
    let instance = this.instances.get(key)
    if (!instance || instance.isDisposed()) {
      instance = echarts.init(dom)
      this.instances.set(key, instance)
    }
    return instance
  }

  /** 更新图表 option */
  update(key: string, option: EChartsOption, notMerge = true): void {
    const instance = this.instances.get(key)
    if (instance && !instance.isDisposed()) {
      instance.setOption(option, { notMerge })
    }
  }

  /** 释放并销毁单个实例 */
  release(key: string): void {
    const instance = this.instances.get(key)
    if (instance && !instance.isDisposed()) {
      instance.dispose()
    }
    this.instances.delete(key)
  }

  /** 全部 resize */
  resizeAll(): void {
    this.instances.forEach((inst) => {
      if (!inst.isDisposed()) inst.resize()
    })
  }

  /** 全部销毁 */
  disposeAll(): void {
    this.instances.forEach((inst) => {
      if (!inst.isDisposed()) inst.dispose()
    })
    this.instances.clear()
  }

  has(key: string): boolean {
    const instance = this.instances.get(key)
    return !!instance && !instance.isDisposed()
  }
}

export const chartPool = new ChartInstancePool()
