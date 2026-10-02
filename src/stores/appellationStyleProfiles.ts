import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  deleteAppellationStyleProfile,
  fetchAppellationStyleProfiles,
  upsertAppellationStyleProfile,
} from '@/services/appellationStyleProfiles'
import type {
  AppellationStyleProfileInput,
  AppellationStyleProfileRecord,
} from '@/types/appellationStyleProfiles'
import type { WineStyle } from '@/types/wineAppellations'

/** Keyed by appellation, like the flavour and food-pairing stores — a page needs only one. */
export const useAppellationStyleProfilesStore = defineStore('appellationStyleProfiles', () => {
  const byAppellation = ref<Record<string, AppellationStyleProfileRecord[]>>({})
  const loading = ref<Record<string, boolean>>({})

  function forAppellation(appellationId: string): AppellationStyleProfileRecord[] {
    return byAppellation.value[appellationId] ?? []
  }

  function profileFor(appellationId: string, style: WineStyle) {
    return forAppellation(appellationId).find((profile) => profile.wine_style === style)
  }

  async function fetchForAppellation(appellationId: string) {
    if (!appellationId) return
    loading.value[appellationId] = true
    try {
      byAppellation.value[appellationId] = await fetchAppellationStyleProfiles(appellationId)
    } finally {
      loading.value[appellationId] = false
    }
  }

  async function save(payload: AppellationStyleProfileInput) {
    const saved = await upsertAppellationStyleProfile(payload)
    const others = forAppellation(payload.appellation_id).filter(
      (profile) => profile.wine_style !== payload.wine_style,
    )
    byAppellation.value[payload.appellation_id] = [...others, saved]
    return saved
  }

  async function remove(record: AppellationStyleProfileRecord) {
    await deleteAppellationStyleProfile(record.id)
    byAppellation.value[record.appellation_id] = forAppellation(record.appellation_id).filter(
      (profile) => profile.id !== record.id,
    )
  }

  return { byAppellation, loading, forAppellation, profileFor, fetchForAppellation, save, remove }
})
