import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  GrapeVarietyRecord,
  CreateGrapeVarietyPayload,
  UpdateGrapeVarietyPayload,
} from '@/services/grapeVarieties'
import {
  fetchGrapeVarieties,
  createGrapeVariety,
  updateGrapeVariety,
  deleteGrapeVariety,
} from '@/services/grapeVarieties'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineGrapeVarietiesStore = defineStore('wineGrapeVarietiesStore', () => {
  const grapeVarieties = ref<GrapeVarietyRecord[]>([])

  async function loadAll() {
    const data = await fetchGrapeVarieties()
    grapeVarieties.value = sortByName(data)
    return grapeVarieties.value
  }

  async function create(payload: CreateGrapeVarietyPayload) {
    const grape = await createGrapeVariety(payload)
    grapeVarieties.value = sortByName([...grapeVarieties.value, grape])
    return grape
  }

  async function update(id: string, payload: UpdateGrapeVarietyPayload) {
    const updated = await updateGrapeVariety(id, payload)
    grapeVarieties.value = sortByName(
      grapeVarieties.value.map((g) => (g.id === updated.id ? updated : g)),
    )
    return updated
  }

  async function remove(id: string) {
    await deleteGrapeVariety(id)
    grapeVarieties.value = grapeVarieties.value.filter((g) => g.id !== id)
  }

  return {
    grapeVarieties,
    loadAll,
    create,
    update,
    remove,
  }
})
