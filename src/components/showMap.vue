<template>
  <div class="g-box">
    <div class="city-card">
      <!-- 起点 -->
      <div class="start">
        <text style="font-size: 12px">起点</text>
        <div class="input-wrapper" :class="{ 'has-value': !existStart }">
          <div v-show="existStart" class="box">
            <img class="img" src="../img/添加.png" />
            <input
              type="text"
              class="input"
              placeholder="请输入地址..."
              v-model="addressStart"
              @keyup.enter="submitStart"
            />
          </div>
          <div class="text-display" v-show="!existStart">
            <span class="text">{{ addressStart }}</span>
            <img class="close" @click="closeStart" src="../img/关闭,取消.png" />
          </div>
        </div>
      </div>

      <!-- 中途 -->
      <div class="process">
        <text style="font-size: 12px">中途</text>
        <div class="process-list">
          <!-- 输入框始终存在，根据状态控制显示 -->
          <div class="input-row" v-show="existProcess">
            <div class="box1">
              <img class="img" src="../img/添加.png" />
              <input
                type="text"
                class="input"
                placeholder="请输入地址..."
                v-model="addressProcess"
                @keyup.enter="submitProcess"
              />
            </div>
          </div>

          <!-- 已添加的节点列表 -->
          <div class="process-item" v-for="(value, index) in arrProcess" :key="index">
            <span class="text">{{ value }}</span>
            <img class="close" @click="closeProcess(index)" src="../img/关闭,取消.png" />
          </div>
        </div>
      </div>

      <!-- 终点 -->
      <div class="end">
        <text style="font-size: 12px">终点</text>
        <div class="input-wrapper" :class="{ 'has-value': !existEnd }">
          <div v-show="existEnd" class="box">
            <img class="img" src="../img/添加.png" />
            <input
              type="text"
              class="input"
              placeholder="请输入地址..."
              v-model="addressEnd"
              @keyup.enter="submitEnd"
            />
          </div>
          <div class="text-display" v-show="!existEnd">
            <span class="text">{{ addressEnd }}</span>
            <img class="close" @click="closeEnd" src="../img/关闭,取消.png" />
          </div>
        </div>
      </div>
    </div>

    <div style="width: 100%; min-height: 400px">
      <weatherData ref="childRef" :citys="citys"></weatherData>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, toRaw } from 'vue'

const addressStart = ref('')
const addressEnd = ref('')
const addressProcess = ref('')
const arrProcess = ref<string[]>([])
const existStart = ref(true)
const existEnd = ref(true)
const existProcess = ref(true)
const emit = defineEmits(['getMapdata'])
const citys = ref<(string | string[])[]>([])
import weatherData from '@/components/showData.vue'

const childRef = ref<InstanceType<typeof weatherData>>()

const submitStart = () => {
  if (!addressStart.value.trim()) return
  existStart.value = false
}

const submitEnd = () => {
  if (!addressEnd.value.trim()) return
  existEnd.value = false
  if (!existEnd.value && !existStart.value) {
    const arr = arrProcess.value
    const points: (string | string[])[] = [addressStart.value, arr, addressEnd.value]
    citys.value = points
    childRef.value?.handleClick(true)
    emit('getMapdata', points)
  }
}

const submitProcess = () => {
  if (!addressProcess.value.trim()) return
  arrProcess.value.push(addressProcess.value)

  addressProcess.value = '' // 清空输入框，允许继续添加
  // 保持 existProcess 为 true，允许继续添加更多中途点
}

const closeStart = () => {
  addressStart.value = ''
  existStart.value = true
  const points: any = []
  childRef.value?.handleClick(false)
  emit('getMapdata', points)
}

const closeEnd = () => {
  addressEnd.value = ''
  existEnd.value = true
  const points: any = []
  childRef.value?.handleClick(false)
  emit('getMapdata', points)
}

const closeProcess = (index: number) => {
  arrProcess.value.splice(index, 1)
  // 如果删除了所有中途点，显示输入框
  if (arrProcess.value.length === 0) {
    existProcess.value = true
  }
}

/** 外部（AI/路由规划）传入城市列表，自动填入起止点和中途点 */
function setExternalRoute(cities: string[]) {
  if (cities.length < 2) return
  addressStart.value = cities[0]
  existStart.value = false
  addressEnd.value = cities[cities.length - 1]
  existEnd.value = false
  if (cities.length > 2) {
    arrProcess.value = cities.slice(1, -1)
    existProcess.value = false
  }
  // 触发路线规划（与 submitEnd 逻辑一致）
  const points: (string | string[])[] = [addressStart.value, arrProcess.value, addressEnd.value]
  citys.value = points
  childRef.value?.handleClick(true)
  emit('getMapdata', points)
}

defineExpose({ setExternalRoute })
</script>

<style scoped>
.g-box {
  width: 100%;
  /* 关键：限制最大高度，超出显示滚动条 */
  max-height: 100vh; /* 或具体像素值如 600px */
  overflow-y: auto;

  /* 可选：平滑滚动 */
  scroll-behavior: smooth;

  /* 可选：自定义滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: #ccc transparent;
  background-color: #fff;
}

/* Webkit 浏览器滚动条样式 */
.g-box::-webkit-scrollbar {
  width: 6px;
}

.g-box::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

.g-box::-webkit-scrollbar-track {
  background-color: transparent;
}

.city-card {
  width: 100%;
  min-height: 20%;
  border-bottom: 1px solid #ddd;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 起点和终点 */
.start,
.end {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 60px; /* 固定最小高度，防止抖动 */
}

/* 输入容器 - 保持尺寸稳定 */
.input-wrapper {
  position: relative;
  margin-left: 10%;
  width: 60%;
  min-width: 10rem;
  min-height: 2rem; /* 保持高度稳定 */
  display: flex;
  align-items: center;
}

/* 中间区域 */
.process {
  flex: 0 0 auto;
  min-height: 40px;
  display: flex;
  padding: 16px;
  align-items: flex-start; /* 改为顶部对齐，适应多行 */
  flex-direction: row;
  border-top: none;
}

.process-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 10%;
  gap: 8px; /* 使用 gap 代替 margin，更稳定 */
}

.input-row {
  width: 100%;
}

.process-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  width: 72%;
  min-width: 10rem;
}

.img {
  width: 1.5rem;
  height: 1.5rem;
  transition: transform 0.3s ease 0.1s;
  flex-shrink: 0;
}

.input {
  margin-left: 10px;
  border: none;
  outline: none;
  background: transparent;
  transition: opacity 0.3s ease 0.1s;
  opacity: 0;
  flex: 1;
  font-size: 14px;
}

.box {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.box1 {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 60%;
  min-width: 10rem;
  padding: 8px 0;
}

.box:hover .img,
.box1:hover .img {
  transform: rotate(45deg);
}

.box:hover .input,
.box1:hover .input {
  opacity: 1;
}

/* 文本显示模式 - 绝对定位避免布局变化 */
.text-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}

.text {
  font-size: 15px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: 8px;
}

.close:hover {
  opacity: 1;
}

/* 当 has-value 时，调整 input-wrapper 的布局 */
.input-wrapper.has-value {
  /* 保持相同的尺寸，避免抖动 */
}

@media (max-width: 768px) {
  .input-wrapper { width: 80%; margin-left: 5%; }
  .start, .end { padding: 12px; min-height: 50px; }
}
</style>
