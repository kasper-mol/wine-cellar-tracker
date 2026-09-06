import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserWine, WineCreatePayload, WineUpdatePayload } from '@/types/wines'
import { wineRecordToUserWine } from '@/types/wines'
import { fetchUserWines, createWine, updateWine, deleteWine } from '@/services/wines'
import type { DrinkBottlePayload } from '@/types/consumption'
import { drinkBottle as drinkBottleService } from '@/services/consumption'

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

  async function addWine(payload: WineCreatePayload, grapeIds: string[] = []) {
    const record = await createWine(payload, grapeIds)
    userWines.value = [wineRecordToUserWine(record), ...userWines.value]
    return record
  }

  async function editWine(id: string, payload: WineUpdatePayload, grapeIds?: string[]) {
    const record = await updateWine(id, payload, grapeIds)
    const updated = wineRecordToUserWine(record)
    userWines.value = userWines.value.map((wine) => (wine.id === id ? updated : wine))
    return record
  }

  async function removeWine(id: string) {
    await deleteWine(id)
    userWines.value = userWines.value.filter((wine) => wine.id !== id)
  }

  async function drinkBottle(payload: DrinkBottlePayload) {
    // Atomic insert-event + decrement on the server; returns the new stock count.
    const newQuantity = await drinkBottleService(payload)
    userWines.value = userWines.value.map((wine) =>
      wine.id === payload.wineId ? { ...wine, quantity: newQuantity } : wine,
    )
    return newQuantity
  }

  function clearWines() {
    userWines.value = []
  }

  return {
    userWines,
    isLoading,
    totalBottleCount,
    loadWines,
    addWine,
    editWine,
    removeWine,
    drinkBottle,
    clearWines,
  }
})
