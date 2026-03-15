import { defineStore } from 'pinia'
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

export const useVintageRatingsStore = defineStore('vintageRatings', {
  state: () => ({
    sources: [] as VintageRatingSourceRecord[],
    ratings: [] as VintageRatingRecord[],
    loading: false,
  }),

  actions: {
    /* ----------------------------- SOURCES ----------------------------- */

    async fetchSources() {
      this.loading = true
      try {
        this.sources = await listVintageRatingSources()
      } finally {
        this.loading = false
      }
    },

    async addSource(payload: { name: string; url?: string | null; description?: string | null }) {
      const source = await createVintageRatingSource(payload)
      this.sources.push(source)
      return source
    },

    async updateSource(
      id: string,
      payload: { name?: string; url?: string | null; description?: string | null },
    ) {
      const updated = await updateVintageRatingSource(id, payload)
      const index = this.sources.findIndex((s) => s.id === id)
      if (index !== -1) this.sources[index] = updated
      return updated
    },

    async deleteSource(id: string) {
      await deleteVintageRatingSource(id)
      this.sources = this.sources.filter((s) => s.id !== id)
    },

    /* ----------------------------- RATINGS ----------------------------- */

    async fetchRatings(params?: {
      source_id?: string
      region_id?: string
      appellation_id?: string
      year?: number
    }) {
      this.loading = true
      try {
        this.ratings = await listVintageRatings(params)
      } finally {
        this.loading = false
      }
    },

    async addRating(payload: VintageRatingCreatePayload) {
      const rating = await createVintageRating(payload)
      this.ratings.push(rating)
      return rating
    },

    async updateRating(id: string, payload: VintageRatingUpdatePayload) {
      const updated = await updateVintageRating(id, payload)
      const index = this.ratings.findIndex((r) => r.id === id)
      if (index !== -1) this.ratings[index] = updated
      return updated
    },

    async deleteRating(id: string) {
      await deleteVintageRating(id)
      this.ratings = this.ratings.filter((r) => r.id !== id)
    },

    /* -------------------------- BATCH CREATE --------------------------- */

    async addRatingsBatch(payload: VintageRatingsBatchCreatePayload) {
      const inserted = await createVintageRatingsBatch(payload)

      if (inserted?.length) {
        this.ratings.push(...inserted)
      }

      return {
        insertedCount: inserted?.length ?? 0,
        attemptedCount: payload.rows.length,
        skippedCount: payload.rows.length - (inserted?.length ?? 0),
      }
    },
  },
})
