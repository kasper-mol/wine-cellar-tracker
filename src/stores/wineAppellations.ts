import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  WineAppellationRecord,
  WineAppellationCreatePayload,
  WineAppellationUpdatePayload,
} from '@/types/wineAppellations'
import {
  fetchWineAppellations,
  createWineAppellation,
  updateWineAppellation,
  deleteWineAppellation,
} from '@/services/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { isAppellationVisible } from '@/lib/visibility'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineAppellationsStore = defineStore('wineAppellationsStore', () => {
  const regionsStore = useWineRegionsStore()

  /** Everything the caller may read: admins get inactive appellations too, and non-admins also
   *  get the hidden ones their own bottles point at. Manage pages and bottle lookups use this. */
  const allAppellations = ref<WineAppellationRecord[]>([])
  const regionById = computed(() => new Map(regionsStore.allRegions.map((r) => [r.id, r])))
  /** What public pages show: active appellations in an active region. The live region row wins
   *  over the copy embedded in the appellation, so a region toggle applies without a reload. */
  const appellations = computed(() =>
    allAppellations.value.filter((a) => isAppellationVisible(a, regionById.value.get(a.region_id))),
  )
  const loading = ref(false)
  /** True once a load has finished, so "not in the list" can be told from "not fetched yet". */
  const loaded = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      const data = await fetchWineAppellations()
      allAppellations.value = sortByName(data)
      loaded.value = true
      return allAppellations.value
    } finally {
      loading.value = false
    }
  }

  async function create(payload: WineAppellationCreatePayload) {
    const app = await createWineAppellation(payload)
    allAppellations.value = sortByName([...allAppellations.value, app])
    return app
  }

  async function update(id: string, payload: WineAppellationUpdatePayload) {
    const updated = await updateWineAppellation(id, payload)
    allAppellations.value = sortByName(
      allAppellations.value.map((a) => (a.id === updated.id ? updated : a)),
    )
    return updated
  }

  function setActive(id: string, isActive: boolean) {
    return update(id, { is_active: isActive })
  }

  async function remove(id: string) {
    await deleteWineAppellation(id)
    allAppellations.value = allAppellations.value.filter((a) => a.id !== id)
  }

  return {
    appellations,
    allAppellations,
    loading,
    loaded,
    loadAll,
    create,
    update,
    setActive,
    remove,
  }
})
