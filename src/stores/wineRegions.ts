import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
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
import { isRegionVisible } from '@/lib/visibility'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineRegionsStore = defineStore('wineRegionsStore', () => {
  /** Everything the caller may read: admins get inactive regions too. Manage pages use this. */
  const allRegions = ref<WineRegionRecord[]>([])
  /** What public pages show: active regions only. */
  const regions = computed(() => allRegions.value.filter(isRegionVisible))
  const loading = ref(false)
  /** True once a load has finished, so "not in the list" can be told from "not fetched yet". */
  const loaded = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      const data = await fetchWineRegions()
      allRegions.value = sortByName(data)
      loaded.value = true
      return allRegions.value
    } finally {
      loading.value = false
    }
  }

  async function create(payload: WineRegionCreatePayload) {
    const region = await createWineRegion(payload)
    allRegions.value = sortByName([...allRegions.value, region])
    return region
  }

  async function update(id: string, payload: WineRegionUpdatePayload) {
    const updated = await updateWineRegion(id, payload)
    allRegions.value = sortByName(allRegions.value.map((r) => (r.id === updated.id ? updated : r)))
    return updated
  }

  function setActive(id: string, isActive: boolean) {
    return update(id, { is_active: isActive })
  }

  async function remove(id: string) {
    await deleteWineRegion(id)
    allRegions.value = allRegions.value.filter((r) => r.id !== id)
  }

  return { regions, allRegions, loading, loaded, loadAll, create, update, setActive, remove }
})
