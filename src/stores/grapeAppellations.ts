import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  createGrapeAppellation,
  updateGrapeAppellation,
  deleteGrapeAppellation,
  fetchGrapeAppellationsByAppellation,
} from '@/services/grapeAppellations'

import type {
  GrapeAppellationCreatePayload,
  GrapeAppellationRecord,
  GrapeAppellationUpdatePayload,
} from '@/types/grapeAppellations'

export const useGrapeAppellationsStore = defineStore('grapeAppellations', () => {
  const rulesByAppellation = ref<Record<string, GrapeAppellationRecord[]>>({})
  const loading = ref<Record<string, boolean>>({})

  function rulesForAppellation(appellationId: string): GrapeAppellationRecord[] {
    return rulesByAppellation.value[appellationId] ?? []
  }

  async function fetchForAppellation(appellationId: string) {
    if (!appellationId) return

    loading.value[appellationId] = true
    try {
      const rules = await fetchGrapeAppellationsByAppellation(appellationId)
      rulesByAppellation.value[appellationId] = rules
    } finally {
      loading.value[appellationId] = false
    }
  }

  async function create(payload: GrapeAppellationCreatePayload) {
    const rule = await createGrapeAppellation(payload)
    const list = rulesByAppellation.value[payload.appellation_id] ?? []
    rulesByAppellation.value[payload.appellation_id] = [...list, rule]
    return rule
  }

  async function update(id: string, payload: GrapeAppellationUpdatePayload) {
    let foundAppellationId: string | null = null

    for (const [appId, list] of Object.entries(rulesByAppellation.value)) {
      if (list.some((r) => r.id === id)) {
        foundAppellationId = appId
        break
      }
    }

    if (!foundAppellationId) {
      throw new Error('Rule not found in store.')
    }

    const appId = foundAppellationId as string
    const updated = await updateGrapeAppellation(id, payload)

    const existing = rulesByAppellation.value[appId] ?? []
    rulesByAppellation.value[appId] = existing.map((r) => (r.id === id ? updated : r))
  }

  async function remove(id: string) {
    let foundAppellationId: string | null = null

    for (const [appId, list] of Object.entries(rulesByAppellation.value)) {
      if (list.some((r) => r.id === id)) {
        foundAppellationId = appId
        break
      }
    }

    if (!foundAppellationId) {
      throw new Error('Rule not found.')
    }

    await deleteGrapeAppellation(id)

    const appId = foundAppellationId as string
    const existing = rulesByAppellation.value[appId] ?? []
    rulesByAppellation.value[appId] = existing.filter((r) => r.id !== id)
  }

  return {
    rulesByAppellation,
    loading,
    rulesForAppellation,
    fetchForAppellation,
    create,
    update,
    delete: remove,
  }
})
