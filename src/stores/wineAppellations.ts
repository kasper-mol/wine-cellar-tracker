import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WineAppellationRecord,
  CreateWineAppellationPayload,
  UpdateWineAppellationPayload,
} from '@/services/wineAppellations'
import {
  fetchWineAppellations,
  createWineAppellation,
  updateWineAppellation,
  deleteWineAppellation,
} from '@/services/wineAppellations'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineAppellationsStore = defineStore('wineAppellationsStore', () => {
  const appellations = ref<WineAppellationRecord[]>([])

  async function loadAll() {
    const data = await fetchWineAppellations()
    appellations.value = sortByName(data)
    return appellations.value
  }

  async function create(payload: CreateWineAppellationPayload) {
    const app = await createWineAppellation(payload)
    appellations.value = sortByName([...appellations.value, app])
    return app
  }

  async function update(id: string, payload: UpdateWineAppellationPayload) {
    const updated = await updateWineAppellation(id, payload)
    appellations.value = sortByName(
      appellations.value.map((a) => (a.id === updated.id ? updated : a)),
    )
    return updated
  }

  async function remove(id: string) {
    await deleteWineAppellation(id)
    appellations.value = appellations.value.filter((a) => a.id !== id)
  }

  return {
    appellations,
    loadAll,
    create,
    update,
    remove,
  }
})
