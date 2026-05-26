import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAddress = defineStore('address', () => {
  const address = ref('')
  const location = ref(false)
  async function setAddress(res: string) {
    address.value = res
    console.log(address)
  }
  return { address, setAddress, location }
})

export const useMap = defineStore('show', () => {
  const show = ref(1)
  async function setMap(res: number) {
    console.log(res)
    show.value = res
  }
  return { show, setMap }
})
