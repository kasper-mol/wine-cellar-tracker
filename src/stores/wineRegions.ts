import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WineRegionRecord,
  CreateWineRegionPayload,
  UpdateWineRegionPayload,
} from '@/services/wineRegions'
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

  async function loadAll() {
    const data = await fetchWineRegions()
    regions.value = sortByName(data)
    return regions.value
  }

  async function create(payload: CreateWineRegionPayload) {
    const region = await createWineRegion(payload)
    regions.value = sortByName([...regions.value, region])
    return region
  }

  async function update(id: string, payload: UpdateWineRegionPayload) {
    const updated = await updateWineRegion(id, payload)
    regions.value = sortByName(regions.value.map((r) => (r.id === updated.id ? updated : r)))
    return updated
  }

  async function remove(id: string) {
    await deleteWineRegion(id)
    regions.value = regions.value.filter((r) => r.id !== id)
  }

  return {
    regions,
    loadAll,
    create,
    update,
    remove,
  }
})
