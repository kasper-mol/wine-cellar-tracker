import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listVintageRatingSources,
  createVintageRatingSource,
  updateVintageRatingSource,
  deleteVintageRatingSource,
  listVintageRatings,
  createVintageRating,
  updateVintageRating,
  deleteVintageRating,
  createVintageRatingsBatch,
} from '@/services/vintageRatings'
import type {
  VintageRatingSourceRecord,
  VintageRatingRecord,
  VintageRatingCreatePayload,
  VintageRatingUpdatePayload,
  VintageRatingsBatchCreatePayload,
} from '@/types/vintageRatings'

export const useVintageRatingsStore = defineStore('vintageRatings', () => {
  const sources = ref<VintageRatingSourceRecord[]>([])
  const ratings = ref<VintageRatingRecord[]>([])
  const loading = ref(false)

  /* ----------------------------- SOURCES ----------------------------- */

  async function fetchSources() {
    loading.value = true
    try {
      sources.value = await listVintageRatingSources()
    } finally {
      loading.value = false
    }
  }

  async function addSource(payload: { name: string; url?: string | null; description?: string | null }) {
    const source = await createVintageRatingSource(payload)
    sources.value.push(source)
    return source
  }

  async function updateSource(
    id: string,
    payload: { name?: string; url?: string | null; description?: string | null },
  ) {
    const updated = await updateVintageRatingSource(id, payload)
    const index = sources.value.findIndex((s) => s.id === id)
    if (index !== -1) sources.value[index] = updated
    return updated
  }

  async function deleteSource(id: string) {
    await deleteVintageRatingSource(id)
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  /* ----------------------------- RATINGS ----------------------------- */

  async function fetchRatings(params?: {
    source_id?: string
    region_id?: string
    appellation_id?: string
    year?: number
  }) {
    loading.value = true
    try {
      ratings.value = await listVintageRatings(params)
    } finally {
      loading.value = false
    }
  }

  async function addRating(payload: VintageRatingCreatePayload) {
    const rating = await createVintageRating(payload)
    ratings.value.push(rating)
    return rating
  }

  async function updateRating(id: string, payload: VintageRatingUpdatePayload) {
    const updated = await updateVintageRating(id, payload)
    const index = ratings.value.findIndex((r) => r.id === id)
    if (index !== -1) ratings.value[index] = updated
    return updated
  }

  async function deleteRating(id: string) {
    await deleteVintageRating(id)
    ratings.value = ratings.value.filter((r) => r.id !== id)
  }

  /* -------------------------- BATCH CREATE --------------------------- */

  async function addRatingsBatch(payload: VintageRatingsBatchCreatePayload) {
    const inserted = await createVintageRatingsBatch(payload)
    if (inserted?.length) ratings.value.push(...inserted)
    return {
      insertedCount: inserted?.length ?? 0,
      attemptedCount: payload.rows.length,
      skippedCount: payload.rows.length - (inserted?.length ?? 0),
    }
  }

  return {
    sources,
    ratings,
    loading,
    fetchSources,
    addSource,
    updateSource,
    deleteSource,
    fetchRatings,
    addRating,
    updateRating,
    deleteRating,
    addRatingsBatch,
  }
})
