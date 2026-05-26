<script setup lang="ts">
import { useAddress, useMap } from '@/stores/map'
import { useChartStore } from '@/stores/charts'
import { request } from '@/utils/axios'
import { connectSSE } from '@/utils/sseClient'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import 'qweather-icons/font/qweather-icons.css'
import { getWeatherIconUrl } from '@/utils/icon'
import DailyEchars from './dailyEcharts.vue'

const addrStore = useAddress()
const showG = useMap()
const chartStore = useChartStore()

console.log(chartStore.dailyOptions)

const src = ref<string>()
const srcImg = ref<string>()
const wea_text = ref()
const daily = ref<any[]>([])
const nowDate = ref<any>(null)
const colortime = ref()
const sunrise = ref([
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pbWctcW4uNTFtaXouY29tL3ByZXZpZXcvcGhvdG8vMDAvMDEvNTcvNTkvUC0xNTc1OTU4LTdFMUUyRTMyTy5qcGc=&sign=yx:LciQDv168apCOU1rGsUbFSmS2mY=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9waG90by50dWNob25nLmNvbS8xNjk5MTQyNS9mLzY5OTQwMDM3OC5qcGc=&sign=yx:1MWtFCUWBkXifrWsfyMLBPoCrLI=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pa25vdy1waWMuY2RuLmJjZWJvcy5jb20vMGJkMTYyZDlmMmQzNTcyY2Q1ZDVmODQzOTgxMzYzMjc2MmQwYzM3ZQ==&sign=yx:q8gZfQsF_E-nDc7MVFtu-QSrYrw=&tv=0_0',
])
const sunset = ref([
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pbWc5LjUxdGlldHUubmV0L3BpYy8yMDE5LTA5MTIwNi8yNXJ2cmsyaXd6YzI1cnZyazJpd3pjLmpwZw==&sign=yx:ofJ07nsULR5tFd1R5aqIANd8xzs=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly93eDMuc2luYWltZy5jbi9sYXJnZS8wMDhDMTZvb2d5MWh0bmdmODd0ZjdqMzMwcjIwaXg2cS5qcGc=&sign=yx:esJE5suNReIlQ957x9fW1yJv8Zw=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9waG90by50dWNob25nLmNvbS8zMjE3NDAvZi80OTA3MDMzNTEuanBn&sign=yx:a-WgAk82tNoKfuyVzX7wcEwaTwo=&tv=0_0',
])
const night = ref([
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cDovL2ltZy56Y29vbC5jbi9jb21tdW5pdHkvMDM4MTk1ODU3MTBmOGE5MzJmODc1OGM5YjhhODE4Mi5qcGc=&sign=yx:eCCuA-t3BptI3-tG9Hqf-VyOOOs=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pa25vdy1waWMuY2RuLmJjZWJvcy5jb20vMDMwODdiZjQwYWQxNjJkOTdhMDNkYzgyMDNkZmE5ZWM4YjEzY2RiYg==&sign=yx:p0cq2Nn25YGhiCg-sVjSa5pnPzE=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pa25vdy1waWMuY2RuLmJjZWJvcy5jb20vZDhmOWQ3MmE2MDU5MjUyZDZmM2RhYzlhMjY5YjAzM2I1YmI1YjkwMg==&sign=yx:sd9LdthFEypnH1etqrdCdfUDIyg=&tv=0_0',
])
const day = ref([
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9vc3MuaXRvY29vLmNvbS8xMVcyTVlDTy9yZXNjbG91ZDEvM2ZkNjE4NjU4ODg0NDdkZGI4MjQ2ODdmOTk1NTQ0YTUuanBn&sign=yx:tapP2jjMI_5xtgndybPblD_AWMw=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9pa25vdy1waWMuY2RuLmJjZWJvcy5jb20vOGIxMzYzMjc2MmQwZjcwMzMxYThkYjQyMWFmYTUxM2QyNjk3YzUxMg==&sign=yx:cUYrom21YFz98_3FS4ftEMpsH3k=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9jLjUzMzI2LmNvbS9kL2ZpbGUvbGFuMjAxOTExMTQvNGV2eXN3eTB2aWMuanBn&sign=yx:ZYqMfHNwnlY0UQy09WVENocSa3A=&tv=0_0',
  'https://kkimgs.yisou.com/ims?kt=url&at=ori&key=aHR0cHM6Ly9wMy1zaWduLnRvdXRpYW9pbWcuY29tL3BnYy1pbWFnZS8xNTQwODY2ODMyMzM0OGMzMWE5ZmI2NX50cGx2LXR0LW9yaWdpbi1hc3kyOjVhUzA1cDJoUU9Xd2otaS1zT2ktc09tQWdlV2pnZWU2dUE9PS5qcGVnP19pej01ODU1OCZmcm9tPWFydGljbGUucGNfZGV0YWlsJmxrM3M9OTUzMTkyZjQmeC1leHBpcmVzPTE3Mjg5OTA1OTMmeC1zaWduYXR1cmU9NlN6bUdKeHFvJTJCV1N6OTVWNFNEWW1wcXFkZ00lM0Q=&sign=yx:MHh5zq-VnGnm0ew3qDIgCjIYJTw=&tv=0_0',
])
const Address = ref([''])
const addrArr = ref<string[]>([])
const chooseCard = ref([{ value: '温度变化' }, { value: '云量/湿度' }, { value: '风速风向' }])
const selected = ref('')
const idx = ref(-1)
const exist = ref(1)
const Code = ref()

let disconnectSSE: (() => void) | null = null

// 地址变化时：重置图表 + 获取原始数据 + 启动 SSE
watch(
  () => addrStore.address,
  async (address) => {
    if (!address) return

    // 立即重置图表，避免显示旧城市数据
    chartStore.reset()

    // 断开旧 SSE
    if (disconnectSSE) {
      disconnectSSE()
      disconnectSSE = null
    }

    // 更新地址显示
    Address.value = address.trim().split(' ')
    if (addrArr.value?.length <= 5) {
      if (Address.value[0]?.includes('市')) {
        addrArr.value?.unshift(address)
      } else {
        const newAddr = (Address.value?.[1] ?? '') + (Address.value?.[2] ?? '')
        addrArr.value?.unshift(newAddr)
      }
    } else {
      addrArr.value?.pop()
      addrArr.value?.unshift(address)
    }

    // 初始数据获取（聚合接口）
    try {
      const res = await request('/weather/aggregate', 'GET', { location: address })
      const { now, daily: dailyData } = res.data.data || {}

      if (now?.now) {
        nowDate.value = now.now
        wea_text.value = now.now.text
        src.value = getWeatherIconUrl(now.now.text)
      }
      if (dailyData?.daily) {
        const restDays = dailyData.daily.map((item: any) => ({
          ...item,
          fxDate: item.fxDate.slice(5),
        }))
        daily.value = restDays
      }
    } catch (e) {
      console.error('聚合数据获取失败:', e)
    }

    // 更新背景图
    srcImg.value = await getImg()

    // 启动 SSE
    disconnectSSE = connectSSE(address, chartStore)
  },
  { immediate: true },
)

onMounted(async () => {})

// 监听 SSE 推送的实时天气更新
watch(
  () => chartStore.nowWeather,
  (now) => {
    if (now) {
      nowDate.value = now
      wea_text.value = now.text
      src.value = getWeatherIconUrl(now.text)
    }
  },
)

async function getImg() {
  let Img = ''
  const hour = new Date().getHours()
  colortime.value = hour
  if (hour >= 6 && hour < 7) Img = sunrise.value[Math.floor(Math.random() * sunrise.value.length)] || ''
  else if (hour >= 7 && hour < 18) Img = day.value[Math.floor(Math.random() * day.value.length)] || ''
  else if (hour >= 18 && hour < 19) Img = sunset.value[Math.floor(Math.random() * sunset.value.length)] || ''
  else Img = night.value[Math.floor(Math.random() * night.value.length)] || ''
  return Img
}

async function handleClick() {
  addrStore.location = true
}

// idx → seriesType 映射：0=temp, 1=cloud, 2=wind
const dailySeriesMap = ['temp', 'cloud', 'wind']

function ClickCard(index: number) {
  idx.value = index
  selected.value = chooseCard.value[index]?.value || ''
  exist.value = 0
}

function closeCard() {
  selected.value = ''
  exist.value = 1
}

const nowWeather = computed(() => {
  return Code.value
})

onUnmounted(() => {
  if (disconnectSSE) {
    disconnectSSE()
    disconnectSSE = null
  }
  chartStore.reset()
})

function showMap() {
  showG.setMap(0)
}
</script>

<template>
  <div class="container" :style="{ backgroundImage: `url(${srcImg})` }">
    <div class="mask"></div>
  </div>
  <div class="main-img" :style="{ backgroundImage: `url(${srcImg})` }">
    <div style="width: 100%; height: 100%" v-if="selected">
      <DailyEchars :chart-option="(chartStore.dailyOptions[dailySeriesMap[idx]!] as any) || null" style="width: 100%; height: 90%"></DailyEchars>
    </div>

    <div class="unper-new" style="opacity: 0">
      <div class="unper-card1"></div>
      <div class="unper-card2"></div>
      <div class="unper-card3"></div>
    </div>

    <div class="search-card" v-show="exist">
      <div class="search-icon"><img src="../img/search.png" /></div>
      <input type="text" class="search-input" placeholder="请输入地址..." />
    </div>

    <img @click="showMap" v-show="exist" src="../img/三维地图.png" class="g-img" />

    <div class="address" v-show="exist">
      <div class="addIcon">
        <img class="add-img" @click="handleClick" src="../img/地址.png" />
        <span class="add-box"></span>
        <span class="add-box1"></span>
      </div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 5px">
        <text v-for="value in Address" :key="value">{{ value }}</text>
      </div>
    </div>

    <div class="choose-card">
      <div
        v-for="(item, index) in chooseCard"
        :key="index"
        class="temp-card"
        :class="'color-' + (index % 3)"
        @click="ClickCard(index)"
      >
        <text style="margin-top: 3%">{{ item.value }}</text>
      </div>
    </div>

    <div class="unper" v-if="selected" @click="closeCard">
      <div class="unper-card1"></div>
      <div class="unper-card2"></div>
      <div class="unper-card3"></div>
    </div>
  </div>
  <div :class="['today', { backcolor: colortime >= 6 && colortime < 18 }]">
    <div class="today-text">实时天气</div>
    <div style="width: auto; height: auto" class="nowbox">
      <img :src="src" alt="Weather Icon" class="nowbox-img" />
      <text>{{ nowDate?.temp }} °</text>
    </div>
    <div
      style="
        display: flex;
        flex-direction: row;
        gap: 20px;
        margin-top: 2%;
        justify-content: center;
      "
    >
      <div class="nowbox-text">{{ nowDate?.text }}</div>
      <div class="nowbox-text">{{ nowDate?.windDir }}</div>
    </div>
    <div class="nowbox-card">
      <div>
        <img class="card-icon" src="../img/大风.png" />
        <div style="display: flex; flex-direction: row">
          <text class="card-text">{{ nowDate?.windSpeed }}</text>
          <span>km/h</span>
        </div>
        <p>风速</p>
      </div>
      <div>
        <img class="card-icon" src="../img/大雨.png" />
        <div style="display: flex; flex-direction: row">
          <text class="card-text">{{ nowDate?.precip }}</text>
          <span>mm</span>
        </div>
        <p>降水量</p>
      </div>
      <div>
        <img class="card-icon" src="../img/露.png" />
        <div style="display: flex; flex-direction: row">
          <text class="card-text">{{ nowDate?.humidity }}</text>
          <span>°</span>
        </div>
        <p>湿度</p>
      </div>
    </div>
  </div>
  <div class="daily">
    <div
      :class="['firstbox', { backcolor: colortime >= 6 && colortime < 18 }]"
      v-for="(item, key) in daily"
      :key="key"
    >
      <text>{{ item?.fxDate }}</text>
      <div class="box-icon">
        <div>
          <text>白天</text>
          <i :class="'qi-' + item?.iconDay" class="weather-icon"></i>
        </div>
        <div>
          <text>夜晚</text>
          <i :class="'qi-' + item?.iconNight" class="weather-icon"></i>
        </div>
      </div>
      <div class="temp">
        <text>{{ item?.tempMax }}°C ~ {{ item?.tempMin }}°C</text>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backcolor {
  background-color: rgba(235, 235, 235, 0.3);
  box-shadow: 5px 5px 5px rgba(255, 255, 255, 0.7);
}

.container {
  position: relative;
  height: 100%;
  width: 100%;
  background-size: cover;
  background-position: center;
  display: flex;
  filter: blur(3px);
}

.mask {
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.main-img {
  position: absolute;
  top: 3%;
  left: 3%;
  width: 68%;
  height: 65%;
  background-size: cover;
  z-index: 1;
  box-shadow: inset -2px -2px 2px rgba(24, 24, 24, 0.7);
  border-top-left-radius: 5px;
}

.search-card {
  position: absolute;
  top: 6%;
  left: 2%;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  border-radius: 20px;
  transition: all 0.7s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.search-card:hover {
  width: 40%;
  height: 10%;
  border: 1px solid #efefef;
}

.search-card img {
  width: 40px;
  height: 40px;
  margin-left: 3%;
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  margin-left: 3%;
  width: 70%;
  color: #efefef;
  transition: all 0.3s ease 0.1s;
}

.g-img {
  width: 1.8rem;
  height: 1.8rem;
  position: absolute;
  top: 8%;
  right: 20%;
}

.address {
  position: absolute;
  top: 0%;
  right: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  perspective: 30px;
  transform-style: preserve-3d;
  width: 150px;
  height: 180px;
}

.addIcon {
  position: relative;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.add-box {
  position: absolute;
  border: 1.5px solid #fff;
  width: 15px;
  height: 7px;
  transform: translate3d(0, 0, 5px);
  transform: rotateX(45deg);
  bottom: 25%;
  border-radius: 50%;
  animation: fadeInOut 2s ease-in-out infinite;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate3d(0, 0px, var(--z)) rotateX(45deg);
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(0, 6px, var(--z)) rotateX(45deg);
  }
}

.add-box {
  --z: 3px;
}
.add-box1 {
  --z: 7px;
}

.add-box1 {
  position: absolute;
  border: 0.5px solid #fff;
  width: 25px;
  height: 11px;
  transform: translate3d(0, 0, 5px);
  transform: rotateX(45deg);
  bottom: 15%;
  border-radius: 50%;
  animation: fadeInOut 2s ease-in-out infinite 0.7s;
}

.address text {
  font-size: 14px;
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
}

.add-img {
  width: 40px;
  height: 40px;
  animation: Route 2s ease-in-out infinite;
}

@keyframes Route {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-4px);
  }
  100% {
    transform: translateY(0px);
  }
}

.addrArr {
  margin-left: 100%;
  color: #fff;
  display: flex;
  font-size: 15px;
}

.addAddr {
  position: absolute;
  right: 14%;
  top: 7%;
  width: 25px;
  height: 25px;
}

.addAddr:hover {
  cursor: pointer;
  transform: rotate(180deg);
  transition: transform 0.8s;
}

.choose-card {
  position: absolute;
  bottom: 0%;
  left: 0%;
  width: 75%;
  height: 10%;
  display: flex;
  flex-direction: row;
}

.color-0 {
  --card-color: 64, 158, 255;
}
.color-1 {
  --card-color: 245, 108, 108;
}
.color-2 {
  --card-color: 230, 162, 60;
}

.temp-card {
  width: 33.3%;
  height: 100%;
  color: #ddd;
  display: flex;
  justify-content: center;
  font-size: 1.5vw;
  position: relative;
  background: rgba(var(--card-color), 0.2);
  overflow: hidden;
}

.temp-card:hover {
  cursor: pointer;
  background: rgba(var(--card-color), 0.5);
  box-shadow: 0 4px 8px rgba(var(--card-color), 0.3);
}

.temp-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 15%;
  background: rgba(var(--card-color), 0.7);
  pointer-events: none;
  z-index: 0;
}

.temp-card > * {
  position: relative;
  z-index: 1;
}

.unper {
  position: absolute;
  bottom: 3%;
  right: 10%;
  width: 3%;
  height: 8%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.unper-new {
  position: absolute;
  width: 3%;
  height: 8%;
  right: 0px;
  top: 45%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: rotate(90deg);
}

.unper-card1,
.unper-card2,
.unper-card3 {
  border-bottom: 2px solid #fff;
  border-right: 2px solid #fff;
  width: 15px;
  height: 15px;
  position: absolute;
  transform: rotate(45deg);
}

.unper-card1 {
  top: 0%;
  animation: closeUp 2s ease-in-out infinite 0.5s;
}

.unper-card2 {
  top: 20%;
  animation: closeUp 2s ease-in-out infinite 1s;
}

.unper-card3 {
  top: 40%;
  animation: closeUp 2s ease-in-out infinite 1.5s;
}

@keyframes closeUp {
  0% {
    transform: rotate(45deg) scale(1);
    opacity: 1;
  }
  50% {
    transform: rotate(45deg) scale(1.1);
    opacity: 0.3;
  }
  100% {
    transform: rotate(45deg) scale(1);
    opacity: 1;
  }
}

.today {
  position: absolute;
  left: 70%;
  top: 3%;
  width: 28%;
  height: 65%;
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5);
  border-top-right-radius: 5px;
}

.today-text {
  margin: 7%;
  font-size: 20px;
  color: #fff;
  font-weight: bold;
}

.nowbox {
  display: flex;
  flex-direction: row;
  height: 40%;
  margin-top: 10%;
}

.nowbox text {
  margin-left: 5%;
  font-size: 5rem;
  color: #fff;
  font-weight: bold;
}

.nowbox-img {
  margin-left: 20%;
  width: 2.5rem;
  height: 2.5rem;
}

.nowbox-card {
  margin-top: 5%;
  width: 100%;
  height: 30%;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  align-items: center;
  line-height: 3rem;
}

.nowbox-card div {
  width: 33%;
  height: 100%;
  display: flex;
  align-items: center;
  flex-direction: column;
}

.nowbox-card div .card-text {
  margin-top: 10%;
  font-size: 28px;
  color: #fff;
  font-weight: bold;
}

.nowbox-card div p {
  margin-top: 5%;
  font-size: 13px;
  color: #fff;
}

.nowbox-card div span {
  position: relative;
  left: 5%;
  top: -12%;
  font-size: 10px;
  color: #fff;
}

.daily {
  position: absolute;
  left: 3%;
  top: 68%;
  width: 95%;
  height: 32%;
  background-color: transparent;
  display: flex;
  flex-direction: row;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  overflow: hidden;
}

.firstbox {
  position: relative;
  bottom: 0%;
  height: 100%;
  width: 15%;
  box-shadow: 2px 2px 2px rgba(0, 0, 0, 1);
  display: flex;
  flex-direction: column;
}

.today .nowbox-text {
  display: flex;
  text-align: center;
  font-size: 15px;
  color: #fff;
  height: 10%;
}

.firstbox text {
  margin-left: 36%;
  margin-top: 15%;
  font-size: 15x;
  color: #fff;
  font-weight: bold;
}

.box-icon {
  display: flex;
  flex-direction: row;
  margin-top: 10%;
  width: 100%;
  justify-content: center;
}

.card-icon {
  margin-top: 20%;
  width: 30px;
  height: 30px;
}

.box-icon text {
  margin-left: 20%;
  font-size: 15px;
  color: #fff;
}

.weather-icon {
  font-size: 35px;
  margin-left: 19%;
  color: #fff;
}

.temp {
  width: 100%;
  height: auto;
  margin-top: 5%;
  font-size: 15px;
  color: #333;
  font-weight: bold;
  display: flex;
  flex-direction: row;
}

.temp text {
  margin-left: 29%;
  color: #fff;
}
</style>
