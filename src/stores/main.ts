import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserWine } from '@/types/wines'
import { wineRecordToUserWine } from '@/types/wines'
import { fetchUserWines } from '@/services/wines'

export const useMainStore = defineStore('main', () => {
  const userWines = ref<UserWine[]>([])
  const isLoading = ref(false)

  const totalBottleCount = computed(() =>
    userWines.value.reduce((total, wine) => total + wine.quantity, 0),
  )

  async function loadWines() {
    isLoading.value = true
    try {
      const records = await fetchUserWines()
      userWines.value = records.map(wineRecordToUserWine)
    } finally {
      isLoading.value = false
    }
  }

  function clearWines() {
    userWines.value = []
  }

  return { userWines, isLoading, totalBottleCount, loadWines, clearWines }
})
