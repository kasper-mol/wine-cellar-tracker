import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createAppellationFlavor,
  deleteAppellationFlavor,
  fetchAppellationFlavors,
} from '@/services/appellationFlavors'
import type {
  AppellationFlavorCreatePayload,
  AppellationFlavorRecord,
} from '@/types/appellationFlavors'

/** Keyed by appellation, like grapeAppellations — a detail page only ever needs one. */
export const useAppellationFlavorsStore = defineStore('appellationFlavors', () => {
  const byAppellation = ref<Record<string, AppellationFlavorRecord[]>>({})
  const loading = ref<Record<string, boolean>>({})

  function forAppellation(appellationId: string): AppellationFlavorRecord[] {
    return byAppellation.value[appellationId] ?? []
  }

  async function fetchForAppellation(appellationId: string) {
    if (!appellationId) return
    loading.value[appellationId] = true
    try {
      byAppellation.value[appellationId] = await fetchAppellationFlavors(appellationId)
    } finally {
      loading.value[appellationId] = false
    }
  }

  async function add(payload: AppellationFlavorCreatePayload) {
    const created = await createAppellationFlavor(payload)
    const list = byAppellation.value[payload.appellation_id] ?? []
    byAppellation.value[payload.appellation_id] = [...list, created]
    return created
  }

  async function remove(record: AppellationFlavorRecord) {
    await deleteAppellationFlavor(record.id)
    const list = byAppellation.value[record.appellation_id] ?? []
    byAppellation.value[record.appellation_id] = list.filter((row) => row.id !== record.id)
  }

  return { byAppellation, loading, forAppellation, fetchForAppellation, add, remove }
})
