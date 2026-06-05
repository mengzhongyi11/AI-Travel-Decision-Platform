<script setup lang="ts">
import Map from '@/components/gaodeMap.vue'
import Weather from '@/components/weather-data.vue'
import { useMap } from '@/stores/map'
import { ref, watch } from 'vue'
const showMap = useMap()
const show = ref(1)
watch(
  () => showMap.show,
  (newVal) => {
    show.value = newVal
  }
)
</script>

<template>
  <div class="page">
    <div class="Map">
      <Map></Map>
    </div>

    <div v-if="show" class="weather">
      <Weather></Weather>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative; /* 创建层叠上下文 */
  width: 100%;
  height: 100%;
}

.Map {
  position: relative;
  width: 100%;
  height: 100%;
  inset: 0;
  z-index: 1;
}

.weather {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: 100%;
  display: flex;
  background-color: #000000;
}

@media (max-width: 768px) {
  .weather { flex-direction: column; overflow-y: auto; }
}
</style>
