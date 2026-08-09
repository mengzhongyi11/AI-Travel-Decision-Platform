<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAddress } from '@/stores/map'

const addrStore = useAddress()

// AMap 配置常量（从环境变量读取，与 gaodeMap.vue 一致）
const AMapConfig = {
  key: import.meta.env.VITE_AMAP_KEY,
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_CODE,
  version: '2.1Beta',
  plugins: ['AMap.PlaceSearch'] as const,
}

interface SearchItem {
  name: string
  value: string
  sub?: string
}

const keyword = ref('')
const suggestions = ref<SearchItem[]>([])
const showDropdown = ref(false)
const activeIdx = ref(-1)
const isComposing = ref(false)
const isFocused = ref(false)
const history = ref<SearchItem[]>([])

let placeSearch: any = null
let loadPromise: Promise<void> | null = null
let debounceTimer: number | undefined
let reqSeq = 0

const HISTORY_KEY = 'weather:search:history'
const MAX_HISTORY = 8

// ---- AMap PlaceSearch 加载（幂等）----
async function ensurePlaceSearch(): Promise<void> {
  if (placeSearch) return
  const loader = (window as any).AMapLoader
  if (!loader) return // jsdom / 非浏览器：静默跳过
  if (!loadPromise) {
    loadPromise = loader
      .load({
        key: AMapConfig.key,
        securityJsCode: AMapConfig.securityJsCode,
        version: AMapConfig.version,
        plugins: AMapConfig.plugins,
      })
      .then(() => {
        placeSearch = new (window as any).AMap.PlaceSearch({
          pageSize: 3,
          pageIndex: 1,
          city: '全国', // 全国范围；勿设 citylimit: true，否则会限死本城市
        })
      })
      .catch((e: unknown) => console.error('PlaceSearch 初始化失败:', e))
  }
  await loadPromise
}

// 选中 POI 后传给天气链路的值：优先城市名，直辖市 cityname 是空数组需回退省名
function toCityValue(poi: any): string {
  const city = Array.isArray(poi.cityname) ? (poi.cityname[0] ?? '') : poi.cityname
  return city || poi.pname || poi.name
}

// ---- 输入防抖 + 竞态丢弃 ----
function onInput() {
  window.clearTimeout(debounceTimer)
  if (isComposing.value) return // 中文拼音组合中不触发
  const kw = keyword.value.trim()
  if (!kw) {
    suggestions.value = []
    activeIdx.value = -1
    showDropdown.value = isFocused.value && history.value.length > 0
    return
  }
  debounceTimer = window.setTimeout(runSearch, 300)
}

async function runSearch() {
  const kw = keyword.value.trim()
  const seq = ++reqSeq
  await ensurePlaceSearch()
  if (!placeSearch || seq !== reqSeq) return
  placeSearch.search(kw, (status: string, result: any) => {
    if (seq !== reqSeq) return
    const pois: any[] = result?.poiList?.pois ?? []
    suggestions.value =
      status === 'complete' && pois.length
        ? pois
            .map((p) => ({
              name: p.name,
              value: toCityValue(p),
              sub: [p.pname, Array.isArray(p.cityname) ? '' : p.cityname, p.adname]
                .filter(Boolean)
                .join(' '),
            }))
            .slice(0, 3)
        : []
    showDropdown.value = true
    activeIdx.value = -1
  })
}

// ---- 历史记录 ----
function loadHistory() {
  if (typeof window === 'undefined') return
  try {
    history.value = JSON.parse(window.localStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    history.value = []
  }
}

function saveHistory(value: string) {
  history.value = [
    { name: value, value },
    ...history.value.filter((h) => h.value !== value),
  ].slice(0, MAX_HISTORY)
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
  } catch {
    /* 隐私模式 / 配额：静默失败 */
  }
}

// ---- 交互 ----
const visibleList = computed(() =>
  keyword.value.trim() ? suggestions.value : history.value,
)

function applySearch(value: string, name: string) {
  addrStore.setAddress(value)
  saveHistory(value)
  keyword.value = name
  showDropdown.value = false
  activeIdx.value = -1
}

function selectItem(item: SearchItem) {
  applySearch(item.value, item.name)
}

// 直接回车提交当前关键词（无联想命中时也保存历史）
function submitKeyword() {
  const kw = keyword.value.trim()
  if (kw) applySearch(kw, kw)
}

function onFocus() {
  isFocused.value = true
  if (!keyword.value.trim()) {
    showDropdown.value = history.value.length > 0
  }
}

function onBlur() {
  isFocused.value = false
  showDropdown.value = false
  activeIdx.value = -1
}

function onKeydown(e: KeyboardEvent) {
  const list = visibleList.value
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (list.length) activeIdx.value = (activeIdx.value + 1) % list.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (list.length) activeIdx.value = (activeIdx.value - 1 + list.length) % list.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (list.length) selectItem(list[activeIdx.value >= 0 ? activeIdx.value : 0]!)
    else submitKeyword()
  } else if (e.key === 'Escape') {
    showDropdown.value = false
    activeIdx.value = -1
  }
}

function onCompositionStart() {
  isComposing.value = true
}

function onCompositionEnd() {
  isComposing.value = false
  onInput() // 组合结束后补一次搜索
}

onMounted(loadHistory)
onUnmounted(() => window.clearTimeout(debounceTimer))
</script>

<template>
  <div class="cs-wrap">
    <div class="cs-card">
      <img class="cs-icon" src="../img/search.png" alt="搜索" />
      <input
        v-model="keyword"
        class="cs-input"
        type="text"
        placeholder="请输入地址..."
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
    </div>

    <div v-if="showDropdown" class="cs-dropdown">
      <template v-if="keyword.trim()">
        <div
          v-for="(item, i) in suggestions"
          :key="item.value + i"
          class="cs-item"
          :class="{ active: i === activeIdx }"
          @mouseenter="activeIdx = i"
          @mousedown.prevent="selectItem(item)"
        >
          <div class="cs-item-name">{{ item.name }}</div>
          <div v-if="item.sub" class="cs-item-sub">{{ item.sub }}</div>
        </div>
        <div v-if="!suggestions.length" class="cs-empty">无匹配地点</div>
      </template>
      <template v-else>
        <div v-if="history.length" class="cs-h-title">搜索历史</div>
        <div
          v-for="(item, i) in history"
          :key="item.value"
          class="cs-item"
          :class="{ active: i === activeIdx }"
          @mouseenter="activeIdx = i"
          @mousedown.prevent="selectItem(item)"
        >
          <div class="cs-item-name">{{ item.name }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cs-wrap {
  position: absolute;
  top: 6%;
  left: 2%;
  width: 2.5rem;
  height: 2.5rem;
  z-index: 20;
  display: flex;
  flex-direction: column;
  transition: width 0.7s cubic-bezier(0.4, 0, 0.2, 1);
}

.cs-wrap:hover,
.cs-wrap:focus-within {
  width: 40%;
}

.cs-card {
  display: flex;
  align-items: center;
  height: 2.5rem;
  flex: none;
  border-radius: 20px;
  overflow: hidden; /* 负责折叠，不裁剪下拉 */
}

.cs-wrap:hover .cs-card,
.cs-wrap:focus-within .cs-card {
  border: 1px solid #efefef;
}

.cs-icon {
  width: 40px;
  height: 40px;
  margin-left: 3%;
  flex: none;
}

.cs-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  margin-left: 3%;
  width: 100%;
  color: #efefef;
  opacity: 0;
  transition: opacity 0.3s ease 0.1s;
}

.cs-wrap:hover .cs-input,
.cs-wrap:focus-within .cs-input {
  opacity: 1;
}

.cs-dropdown {
  margin-top: 8px;
  padding: 6px 0;
  max-height: 300px;
  overflow-y: auto;
  background: rgba(20, 20, 30, 0.92);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.cs-item {
  padding: 8px 14px;
  cursor: pointer;
  color: #efefef;
}

.cs-item.active,
.cs-item:hover {
  background: rgba(255, 255, 255, 0.12);
}

.cs-item-name {
  font-size: 15px;
}

.cs-item-sub {
  font-size: 12px;
  color: rgba(239, 239, 239, 0.7);
  margin-top: 2px;
}

.cs-h-title {
  font-size: 12px;
  color: rgba(239, 239, 239, 0.55);
  padding: 6px 14px;
}

.cs-empty {
  padding: 10px 14px;
  font-size: 13px;
  color: rgba(239, 239, 239, 0.6);
}

/* 移动端：保持现状（不新增适配），隐藏输入、保留圆形图标 */
@media (max-width: 768px) {
  .cs-wrap {
    position: fixed;
    top: 4%;
    left: 4%;
    width: 36px;
    height: 36px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    z-index: 2;
  }
  .cs-icon {
    width: 20px;
    height: 20px;
    margin: 8px;
  }
  .cs-input,
  .cs-dropdown {
    display: none;
  }
}
</style>
