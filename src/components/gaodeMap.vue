<script setup lang="ts">
import { onMounted, onUnmounted, watch, ref, nextTick, provide } from 'vue'
import '@amap/amap-jsapi-types'
import { useAddress } from '@/stores/map'
import mapAnalysis from '@/components/showMap.vue'
import MaoYile from '@/components/mapTile.vue'
import openAI from '@/components/openAI.vue'
import { useCollect } from '@/stores/from'
// AMap 配置常量（从环境变量读取）
const AMapConfig = {
  key: import.meta.env.VITE_AMAP_KEY,
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
  version: '2.1Beta',
  plugins: [
    'AMap.Geolocation',
    'AMap.ToolBar',
    'AMap.Geocoder',
    'AMap.Driving',
    'AMap.TileLayer',
    'AMap.GLCustomLayer',
    'AMap.Map3D',
    'AMap.Buildings',
    'AMap.CustomCoords', // 自定义坐标转换
    'AMap.Terrain', // 3D 地形（如需要）
  ] as const,
}

const points = ref(0)

// 全局声明的 window._AMapSecurityConfig,解决密钥问题
window._AMapSecurityConfig = {
  securityJsCode: AMapConfig.securityJsCode,
}

// 类型定义
interface GeocoderResult {
  regeocode: {
    addressComponent: {
      province: string
      city: string
      district: string
    }
  }
}

interface GeolocationResult {
  position: {
    lng: number
    lat: number
  }
}

// 组件状态
let map: AMap.Map | null = null
let currentMarker: AMap.Marker | null = null
let geolocationControl: AMap.Geolocation | null = null
let toolbarControl: AMap.ToolBar | null = null
let drivingInstance: AMap.Driving | null = null // 复用实例
const addrStore = useAddress()
const collectStore = useCollect()
const isMapInitialized = ref(false)
const ZOOM_3D = 12

// 标记点内容
const markerContent = `
  <div class="custom-content-marker">
    <img src="https://a.amap.com/jsapi_demos/static/demo-center/icons/dir-via-marker.png "/>
  </div>`

// 监听定位请求
watch(
  () => addrStore.location,
  async (newVal) => {
    if (newVal && isMapInitialized.value) {
      await initGeolocation()
      addrStore.location = false
    }
  },
)

// 组件挂载时初始化地图
onMounted(async () => {
  try {
    await initializeMap()
  } catch (error) {
    console.error('地图初始化失败:', error)
  }
})

// 组件卸载时销毁地图
onUnmounted(() => {
  map?.destroy()
  map = null
  currentMarker = null
  geolocationControl = null
  toolbarControl = null
  drivingInstance = null
})

provide('amapInstance', map)

/**
 * 初始化地图
 */
async function initializeMap(): Promise<void> {
  try {
    // 加载 AMap SDK
    await (window as any).AMapLoader.load({
      key: AMapConfig.key,
      securityJsCode: AMapConfig.securityJsCode,
      version: AMapConfig.version,
      plugins: AMapConfig.plugins,
    })

    // 默认中心坐标（北京）
    const defaultCenter: [number, number] = [116.397428, 39.90923]

    // 创建地图实例
    map = new AMap.Map('container', {
      zoom: 11,
      zooms: [3, 20],
      viewMode: '3D',
      center: defaultCenter,
      pitch: 0,
      showBuildingBlock: true,
    })

    map.on('zoomchange', () => {
      const z = map?.getZoom()
      if (z >= ZOOM_3D) {
        // 切换到3D效果
        console.log('切换到3D模式')
        // 平滑过渡到 3D 视角
        map?.setPitch(45)
        map?.setRotation(10)
      } else {
        // 切换回2D效果
        map?.setPitch(0)
        map?.setRotation(0)
        // remove3DLayer()
      }
    })

    // 初始化控件
    await initControls()

    // 初始化 Driving（只创建一次）
    drivingInstance = new AMap.Driving({
      map: map,
      policy: AMap.DrivingPolicy.LEAST_TIME,
    })

    // 设置默认中心和地址
    getCenterAddress(defaultCenter)
    setMapCenter(defaultCenter)

    // 标记地图已初始化
    isMapInitialized.value = true
  } catch (error) {
    console.error('地图初始化失败:', error)
    throw error
  }
}

/**
 * 初始化地图控件
 */
async function initControls(): Promise<void> {
  if (!map) return

  // 创建并添加工具栏
  if (!toolbarControl) {
    toolbarControl = new AMap.ToolBar({
      offset: [70, 50],
      position: 'RB',
    })
    map.addControl(toolbarControl)
  }

  // 初始化定位控件
  await initGeolocation()
}

/**
 * 初始化定位控件并获取当前位置
 */
async function initGeolocation(): Promise<void> {
  if (!map) return

  try {
    // 创建定位控件
    if (!geolocationControl) {
      geolocationControl = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        showButton: false,
        showMarker: true,
        showCircle: true,
        extensions: 'all',
        position: 'RT',
        offset: [70, 30],
      })

      map.addControl(geolocationControl)

      // 监听定位完成事件
      geolocationControl.on('complete', handleGeolocationComplete)
      geolocationControl.on('error', handleGeolocationError)
    }

    // 触发定位
    geolocationControl.getCurrentPosition()
  } catch (error) {
    console.error('定位初始化失败:', error)
  }
}

/**
 * 处理定位完成事件
 */
function handleGeolocationComplete(result: GeolocationResult): void {
  const { lng, lat } = result.position
  const center: [number, number] = [lng, lat]
  console.log('定位完成:', center)

  // 更新地址信息
  getCenterAddress(center)
  // 更新地图中心
  setMapCenter(center)
}

/**
 * 处理定位错误事件
 */
function handleGeolocationError(error: any): void {
  console.error('定位失败:', error)
}

/**
 * 根据坐标获取地址信息
 */
function getCenterAddress(center: [number, number]): void {
  if (!map) return

  const [lng, lat] = center
  const geocoder = new AMap.Geocoder()

  geocoder.getAddress(new AMap.LngLat(lng, lat), (status: string, result: GeocoderResult) => {
    if (status === 'complete') {
      const comp = result.regeocode.addressComponent
      const province = comp.province
      const city = comp.city || comp.district
      const district = city !== comp.district ? comp.district : ''
      const addr = `${province} ${city} ${district}`.trim()

      console.log('反解析地址为：', addr)

      addrStore.setAddress(addr)
      const data = {
        location: addr,
      }
      collectStore.collectData(data)
    } else {
      console.error('反解析失败:', result)
    }
  })
}

/**
 * 设置地图中心并添加标记
 */
function setMapCenter(center: [number, number]): void {
  if (!map) return

  // 设置地图中心和缩放级别
  map.setZoomAndCenter(8, center)

  const [lng, lat] = center
  const position = new AMap.LngLat(lng, lat)

  // 移除上一个标记
  currentMarker?.setMap(null)

  // 创建新标记
  currentMarker = new AMap.Marker({
    position: position,
    content: markerContent,
    offset: new AMap.Pixel(-13, -30),
  })

  // 添加标记到地图
  map.add(currentMarker)
}

async function geocodeAddress(item: any): Promise<[number, number][]> {
  let addresses: string[]

  if (typeof item === 'string') {
    addresses = [item]
  } else if (Array.isArray(item)) {
    addresses = item
      .map((addr) => {
        if (typeof addr === 'string') return addr
        if (addr && typeof addr === 'object') {
          return addr.keyword || addr.address || String(addr)
        }
        return String(addr)
      })
      .filter(Boolean)
  } else if (item && typeof item === 'object') {
    const addr = item.keyword || item.address || String(item)
    addresses = addr ? [addr] : []
  } else {
    addresses = [String(item)]
  }

  if (addresses.length === 0) {
    throw new Error(`无法提取地址: ${JSON.stringify(item)}`)
  }

  // 强制串行 + 延迟
  const coords: [number, number][] = []

  // 确保前一个完全完成后再发下一个
  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i]

    // 每个请求之间强制等待（除了第一个）
    if (i > 0) {
      await new Promise((r) => setTimeout(r, 300)) // 300ms 间隔
    }

    console.log(`[${i + 1}/${addresses.length}] 开始解析: ${addr}`)

    try {
      const coord = await geocodeSingle(addr)
      coords.push(coord)
    } catch (err) {
      console.error(`[${i + 1}/${addresses.length}] ✗ 失败:`, err)
    }
  }
  return coords
}

function geocodeSingle(addr: string): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    const geocoder = new AMap.Geocoder({ city: '全国' })

    let isCompleted = false
    const timeout = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true
        // 超时后尝试重试一次
        console.warn(`[超时重试] ${addr}`)
        geocodeSingle(addr).then(resolve).catch(reject)
      }
    }, 2000)

    geocoder.getLocation(addr, (status: string, result: any) => {
      if (isCompleted) return
      isCompleted = true
      clearTimeout(timeout)

      console.log(`  -> status: ${status}, info: ${result?.info}`)

      if (status === 'complete' && result.geocodes?.[0]?.location) {
        const loc = result.geocodes[0].location
        resolve([loc.lng, loc.lat])
      } else {
        reject(new Error(`${addr}: ${result?.info || status}`))
      }
    })
  })
}

async function getMapdata(data: any[]) {
  if (!drivingInstance || !map) {
    console.warn('地图或Driving未初始化')
    return
  }

  // 展平所有坐标点（关键修改）
  const allCoords: [number, number][] = []

  try {
    points.value = 1 // 显示加载状态
    await nextTick()

    for (const item of data) {
      try {
        const coords = await geocodeAddress(item)
        allCoords.push(...coords)
      } catch (err) {
        console.warn('地址解析失败，跳过:', item, err)
      }
    }

    console.log('所有解析后的坐标:', allCoords)

    if (allCoords.length < 2) {
      console.error(`仅 ${allCoords.length} 个有效坐标，无法规划路线`)
      drivingInstance?.clear()
      points.value = 0
      return
    }

    drivingInstance.clear()
    drivingInstance = new AMap.Driving({
      map: map,
      panel: 'my-panel',
      policy: AMap.DrivingPolicy.LEAST_TIME,
    })

    const start = allCoords[0]
    const end = allCoords[allCoords.length - 1]
    const waypoints = allCoords.slice(1, -1)

    const startLngLat = new AMap.LngLat(start[0], start[1])
    const endLngLat = new AMap.LngLat(end[0], end[1])

    const searchOpts =
      waypoints.length > 0
        ? {
            waypoints: waypoints.map((p) => new AMap.LngLat(p[0], p[1])),
          }
        : undefined

    console.log('路线参数:', { 起点: start, 终点: end, 途经点数量: waypoints.length })

    drivingInstance.search(startLngLat, endLngLat, searchOpts, (status: string, result: any) => {
      if (status === 'complete') {
        console.log('规划成功:', result)
        map?.setFitView()
      } else {
        console.error('规划失败:', result)
        points.value = 0
      }
    })
  } catch (error) {
    console.error('路线规划异常:', error)
    points.value = 0
  }
}

const currentLayer = ref<AMap.TileLayer | null>(null)
const open = ref(0)

async function addWeatherLayer(type: string) {
  if (!map) return
  let ba = 1
  if (type === 'clouds_new') {
    ba = 3
  } else if (type === 'precipitation_new') {
    ba = 2
  } else if (type === 'open') {
    open.value = 1
    return
  }
  currentLayer.value?.setMap(null)
  currentLayer.value = new AMap.TileLayer({
    zIndex: 999,
    tileSize: 128,
    opacity: ba,
    visible: true,
    getTileUrl: (x: number, y: number, z: number) => {
      // 取整确保坐标是整数，避免 OpenWeatherMap 解析失败
      const tx = Math.floor(x)
      const ty = Math.floor(y)
      const tz = Math.floor(z)
      return `http://localhost:3001/weatherMap/getMapData/${type}/${tz}/${tx}/${ty}`
    },
  } as any)
  console.log('添加天气图层:', type)

  currentLayer.value.setMap(map)
}

const existUp = ref(1)
let count = 0
function changeMin() {
  count++
  if (count % 2 === 1) {
    existUp.value = 0
  } else {
    existUp.value = 1
  }
}
</script>

<template>
  <div id="container" class="map-box">
    <div class="Analysis">
      <mapAnalysis @getMapdata="getMapdata"></mapAnalysis>
    </div>

    <div v-if="points" id="my-panel" :class="{ 'panel-section': true, hidden: !existUp }">
      <img class="exist" @click="changeMin" src="../img/关闭,取消.png" />
    </div>

    <div v-if="open" class="card-AI">
      <openAI></openAI>
    </div>

    <div>
      <inputMap></inputMap>
    </div>

    <div class="tile">
      <MaoYile @addWeatherLayer="addWeatherLayer"></MaoYile>
    </div>
  </div>
</template>

<style scoped>
.panel-section {
  position: absolute;
  left: 73%;
  top: 5%;
  width: 380px;
  height: 500px;
  background-color: #fff;
  z-index: 100;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  transition:
    height 0.5s ease,
    opacity 0.5s ease,
    transform 0.5s ease;
}

.map-box {
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.custom-content-marker {
  position: relative;
  width: 25px;
  height: 34px;
}

.custom-content-marker img {
  width: 100%;
  height: 100%;
}

.custom-content-marker .close-btn {
  position: absolute;
  top: -6px;
  right: -8px;
  width: 15px;
  height: 15px;
  font-size: 12px;
  background: #ccc;
  border-radius: 50%;
  color: #fff;
  text-align: center;
  line-height: 15px;
  box-shadow: -1px 1px 1px rgba(10, 10, 10, 0.2);
}

.custom-content-marker .close-btn:hover {
  background: #666;
}

.Analysis {
  width: 27%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
}

.tile {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4.5%;
  background: #ffffff;
  z-index: 8;
}

.card-AI {
  position: absolute;
  top: 4.5%;
  right: 0;
  width: 30%;
  height: 100%;
  z-index: 9;
}

.exist {
  width: 10px;
  height: 10px;
  margin-left: 95%;
}

.hidden {
  height: 20px;
  opacity: 0.9;
  overflow: hidden; /* 收起时隐藏内容 */
}
</style>
