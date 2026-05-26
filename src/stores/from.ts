import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useCollect = defineStore('collect', () => {
  const data = ref([])
  const currentLocation = ref(null)

  async function collectData(res: object) {
    if (!res || typeof res !== 'object' || Object.keys(res).length === 0) return

    if ('location' in res) {
      data.value[0] = res
      data.value.splice(1, Infinity)
      return
    }

    if ('weather' in res) {

      data.value.push(res)
    }

    console.log('当前数据列表：', data.value)
  }

  function resetAll() {
    data.value = []
    currentLocation.value = null
  }

  return { collectData, data, resetAll }
})
