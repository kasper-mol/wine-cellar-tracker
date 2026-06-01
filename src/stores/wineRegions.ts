import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WineRegionRecord,
  WineRegionCreatePayload,
  WineRegionUpdatePayload,
} from '@/types/wineRegions'
import {
  fetchWineRegions,
  createWineRegion,
  updateWineRegion,
  deleteWineRegion,
} from '@/services/wineRegions'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineRegionsStore = defineStore('wineRegionsStore', () => {
  const regions = ref<WineRegionRecord[]>([])
  const loading = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      const data = await fetchWineRegions()
      regions.value = sortByName(data)
      return regions.value
    } finally {
      loading.value = false
    }
  }

  async function create(payload: WineRegionCreatePayload) {
    const region = await createWineRegion(payload)
    regions.value = sortByName([...regions.value, region])
    return region
  }

  async function update(id: string, payload: WineRegionUpdatePayload) {
    const updated = await updateWineRegion(id, payload)
    regions.value = sortByName(regions.value.map((r) => (r.id === updated.id ? updated : r)))
    return updated
  }

  async function remove(id: string) {
    await deleteWineRegion(id)
    regions.value = regions.value.filter((r) => r.id !== id)
  }

  return { regions, loading, loadAll, create, update, remove }
})
