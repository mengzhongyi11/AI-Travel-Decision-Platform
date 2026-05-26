import * as THREE from 'three'

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let directionalLight: THREE.DirectionalLight | null = null
let ambientLight: THREE.AmbientLight | null = null
let waterMaterial: THREE.MeshStandardMaterial | null = null
let isNight: boolean = false

export function initThree(gl: WebGLRenderingContext) {
  // 防止重复初始化
  if (renderer) {
    console.warn('Three.js 已初始化')
    return
  }

  renderer = new THREE.WebGLRenderer({
    context: gl,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })

  renderer.autoClear = false
  renderer.setClearColor(0x000000, 0)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 100, 1 << 30)

  // 光源
  directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(0, 1, 1).normalize()
  scene.add(directionalLight)

  ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  createTerrain()
  createWater()
  createVegetation()

  console.log('Three.js 初始化完成', { scene, camera, renderer })
  return { scene, camera, renderer }
}

function createTerrain() {
  if (!scene) return

  // ✅ 大幅减小：从 1000x1000, 128x128 改为 200x200, 32x32
  const geometry = new THREE.PlaneGeometry(200, 200, 32, 32)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.attributes.position!
  const count = positions.count

  for (let i = 0; i < count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    let height = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 20
    height += Math.random() * 5
    height = Math.max(0, height)
    positions.setY(i, height)
  }

  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const material = new THREE.MeshBasicMaterial({ color: 0x228b22 })
  const terrain = new THREE.Mesh(geometry, material)
  scene.add(terrain)

  console.log('地形创建完成，顶点数:', count) // 应该是 1089 (33*33)
}

function createWater() {
  if (!scene) return

  const geometry = new THREE.PlaneGeometry(100, 100, 16, 16)
  geometry.rotateX(-Math.PI / 2)

  waterMaterial = new THREE.MeshBasicMaterial({
    color: 0x1e90ff,
    transparent: true,
    opacity: 0.6,
  })

  const water = new THREE.Mesh(geometry, waterMaterial)
  water.position.y = 5
  scene.add(water)
}

function createVegetation() {
  if (!scene) return

  const treeGeometry = new THREE.ConeGeometry(2, 6, 6) // 简化
  const treeMaterial = new THREE.MeshBasicMaterial({ color: 0x006400 })

  // ✅ 减少数量：从 50 改为 10
  for (let i = 0; i < 10; i++) {
    const tree = new THREE.Mesh(treeGeometry, treeMaterial)
    const x = Math.random() * 100 - 50
    const z = Math.random() * 100 - 50
    tree.position.set(x, 3, z)
    scene.add(tree)
  }
}

export function updateThree(customCoords: any) {
  if (!camera || !renderer || !scene) {
    console.warn('Three.js 未初始化')
    return
  }

  try {
    // 设置中心点
    customCoords.setCenter([116.397428, 39.90923])

    // 获取相机参数
    const params = customCoords.getCameraParams()

    // 同步相机
    camera.near = params.near
    camera.far = params.far
    camera.fov = params.fov
    camera.position.set(...params.position)
    camera.up.set(...params.up)
    camera.lookAt(...params.lookAt)
    camera.updateProjectionMatrix()

    // 水波动画
    if (waterMaterial) {
      waterMaterial.opacity = 0.6 + 0.1 * Math.sin(Date.now() * 0.001)
    }

    // ✅ 关键：先重置状态，再渲染
    renderer.resetState()
    renderer.clearDepth()
    renderer.render(scene, camera)
    // ✅ 渲染后再重置，恢复高德地图状态
    renderer.resetState()
  } catch (e) {
    console.error('updateThree 错误:', e)
  }
}

// 设置黑夜/白天
export function setNightMode(night: boolean) {
  isNight = night
  if (!scene || !directionalLight || !ambientLight) return

  if (isNight) {
    directionalLight.intensity = 0.15
    ambientLight.intensity = 0.2
  } else {
    directionalLight.intensity = 1.0
    ambientLight.intensity = 0.4
  }
}

// 设置天气
export function applyWeather(weather: any) {
  if (!scene || !directionalLight || !ambientLight) return
  // ... 简化处理
}

export function disposeThree() {
  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
  }
  scene = null
  camera = null
  renderer = null
  waterMaterial = null
  directionalLight = null
  ambientLight = null
}

export { renderer, camera, scene }
