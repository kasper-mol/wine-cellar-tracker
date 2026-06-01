import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  GrapeVarietyRecord,
  GrapeVarietyCreatePayload,
  GrapeVarietyUpdatePayload,
} from '@/types/grapeVarieties'
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
  const loading = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      const data = await fetchGrapeVarieties()
      grapeVarieties.value = sortByName(data)
      return grapeVarieties.value
    } finally {
      loading.value = false
    }
  }

  async function create(payload: GrapeVarietyCreatePayload) {
    const grape = await createGrapeVariety(payload)
    grapeVarieties.value = sortByName([...grapeVarieties.value, grape])
    return grape
  }

  async function update(id: string, payload: GrapeVarietyUpdatePayload) {
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

  return { grapeVarieties, loading, loadAll, create, update, remove }
})
