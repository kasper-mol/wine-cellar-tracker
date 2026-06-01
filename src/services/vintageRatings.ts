import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  VintageRatingCreatePayload,
  VintageRatingsBatchCreatePayload,
  VintageRatingSourceCreatePayload,
  MergedVintageRating,
  VintageRatingUpdatePayload,
  VintageRatingSourceUpdatePayload,
  VintageRatingRecord,
  VintageRatingsBySource,
  VintageRatingSourceRecord,
} from '@/types/vintageRatings'

/* ----------------------------- SOURCES ----------------------------- */

export async function listVintageRatingSources() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('vintage_rating_sources').select('*').order('name')
  throwIfError(error)
  return data as VintageRatingSourceRecord[]
}

export async function createVintageRatingSource(payload: VintageRatingSourceCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('vintage_rating_sources')
    .insert(payload)
    .select()
    .single()
  throwIfError(error)
  return data as VintageRatingSourceRecord
}

export async function updateVintageRatingSource(
  id: string,
  payload: VintageRatingSourceUpdatePayload,
) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('vintage_rating_sources')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as VintageRatingSourceRecord
}

export async function deleteVintageRatingSource(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('vintage_rating_sources').delete().eq('id', id)
  throwIfError(error)
}

/* ----------------------------- RATINGS ----------------------------- */

export async function listVintageRatings(params?: {
  source_id?: string
  region_id?: string
  appellation_id?: string
  year?: number
}) {
  const db = getSupabaseClient()

  let query = db.from('vintage_ratings').select('*')
  if (params?.source_id) query = query.eq('source_id', params.source_id)
  if (params?.region_id) query = query.eq('region_id', params.region_id)
  if (params?.appellation_id) query = query.eq('appellation_id', params.appellation_id)
  if (params?.year) query = query.eq('year', params.year)

  const { data, error } = await query.order('year', { ascending: false })
  throwIfError(error)
  return data as VintageRatingRecord[]
}

export async function createVintageRating(payload: VintageRatingCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('vintage_ratings').insert(payload).select().single()
  throwIfError(error)
  return data as VintageRatingRecord
}

export async function updateVintageRating(id: string, payload: VintageRatingUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('vintage_ratings')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as VintageRatingRecord
}

export async function deleteVintageRating(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('vintage_ratings').delete().eq('id', id)
  throwIfError(error)
}

/* -------------------------- BATCH CREATE --------------------------- */

export async function createVintageRatingsBatch(payload: VintageRatingsBatchCreatePayload) {
  const db = getSupabaseClient()

  const entries = payload.rows.map((row) => ({
    ...row,
    source_id: payload.source_id,
    region_id: payload.region_id ?? null,
    appellation_id: payload.appellation_id ?? null,
  }))

  const { data, error } = await db.from('vintage_ratings').upsert(entries, {
    onConflict: 'source_id,year,region_id,appellation_id',
    ignoreDuplicates: true,
  })
  throwIfError(error)
  return data as VintageRatingRecord[] | null
}

export async function getVintageRatingsBySourceForTarget(params: {
  region_id: string
  appellation_id?: string
}): Promise<VintageRatingsBySource[]> {
  const db = getSupabaseClient()
  const { region_id, appellation_id } = params

  const { data, error } = await db
    .from('vintage_ratings')
    .select(
      `
      source_id,
      year,
      rating,
      rating_type,
      maturity,
      structure_flags,
      drink_from,
      drink_until,
      description,
      region_id,
      appellation_id,
      source:vintage_rating_sources (
        id,
        name
      )
    `,
    )
    .or(
      appellation_id
        ? `appellation_id.eq.${appellation_id},region_id.eq.${region_id}`
        : `region_id.eq.${region_id}`,
    )

  if (error) throw error
  if (!data) return []

  const grouped = new Map<string, VintageRatingsBySource>()

  for (const row of data as any[]) {
    const sourceId = row.source_id
    if (!grouped.has(sourceId)) {
      grouped.set(sourceId, { source_id: sourceId, source_name: row.source.name, ratings: [] })
    }
    grouped.get(sourceId)!.ratings.push({
      year: row.year,
      rating: row.rating,
      rating_type: row.rating_type,
      maturity: row.maturity,
      structure_flags: row.structure_flags,
      drink_from: row.drink_from,
      drink_until: row.drink_until,
      description: row.description,
      fallback: Boolean(appellation_id && !row.appellation_id && row.region_id === region_id),
    })
  }

  // Merge per source: appellation-specific rating takes priority over region fallback
  for (const group of grouped.values()) {
    const byYear = new Map<number, MergedVintageRating>()
    for (const rating of group.ratings) {
      const existing = byYear.get(rating.year)
      if (!existing || existing.fallback) byYear.set(rating.year, rating)
    }
    group.ratings = Array.from(byYear.values()).sort((a, b) => b.year - a.year)
  }

  return Array.from(grouped.values())
}
