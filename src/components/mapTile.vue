<template>
  <div class="choose-card">
    <div class="chat" @click="handClickCard(0)">
      <text>打开AI小助手</text>
    </div>

    <div
      @click="handClickCard(1)"
      style="border-radius: 10px"
      :style="{ backgroundColor: activeIndex === 1 ? '#ffcc80' : 'rgba(255, 255, 255, 0.95)' }"
      class="card"
    >
      降水图
    </div>
    <div
      @click="handClickCard(2)"
      style="margin-left: 5%; border-radius: 10px"
      :style="{ backgroundColor: activeIndex === 2 ? '#ffcc80' : 'rgba(255, 255, 255, 0.95)' }"
      class="card"
    >
      热量图
    </div>
    <div
      @click="handClickCard(3)"
      style="margin-left: 5%; border-radius: 10px"
      :style="{ backgroundColor: activeIndex === 3 ? '#ffcc80' : 'rgba(255, 255, 255, 0.95)' }"
      class="card"
    >
      云向图
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
const emit = defineEmits(
  ['addWeatherLayer']
)
const activeIndex = ref(-1)


const handClickCard = (e: number) => {
  activeIndex.value = e
  console.log('当前激活:', activeIndex.value)
  if (activeIndex.value === 1) {
    emit('addWeatherLayer', 'precipitation_new')
  } else if (activeIndex.value === 2) {
    emit('addWeatherLayer', 'temp_new')
  } else if (activeIndex.value === 3) {
    emit('addWeatherLayer', 'clouds_new')
  } else if (activeIndex.value === 0) {
    emit('addWeatherLayer', 'open')
  }
}
</script>

<style scoped>
.choose-card {
  width: 73%;
  height: 100%;
  margin-left: 27%;
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 14px;
  font-weight: bold;
}

.card {
  width: 15%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
}

.chat {
  width: 41%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
