import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

export type RatingType = 'numeric' | 'grade' | 'range'

export interface MergedVintageRating {
  year: number
  rating: string
  rating_type: 'numeric' | 'grade' | 'range' | null
  maturity: string | null
  structure_flags: string[] | null
  drink_from: number | null
  drink_until: number | null
  description: string | null
  fallback: boolean
}

export interface VintageRatingsBySource {
  source_id: string
  source_name: string
  ratings: MergedVintageRating[]
}

export interface VintageRatingSourceRecord {
  id: string
  name: string
  url: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface VintageRatingRecord {
  id: string
  source_id: string
  year: number
  rating: string
  rating_type: RatingType | null
  maturity: string | null
  structure_flags: string[] | null
  drink_from: number | null
  drink_until: number | null
  description: string | null
  region_id: string | null
  appellation_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateVintageRatingSourcePayload {
  name: string
  url?: string | null
  description?: string | null
}

export interface UpdateVintageRatingSourcePayload
  extends Partial<CreateVintageRatingSourcePayload> {}

export interface CreateVintageRatingPayload {
  source_id: string
  year: number
  rating: string
  rating_type?: RatingType | null
  maturity?: string | null
  structure_flags?: string[] | null
  drink_from?: number | null
  drink_until?: number | null
  description?: string | null
  region_id?: string | null
  appellation_id?: string | null
}

export interface UpdateVintageRatingPayload extends Partial<CreateVintageRatingPayload> {}

export interface VintageRatingRowInput {
  year: number
  rating: string
  rating_type?: RatingType | null
  maturity?: string | null
  structure_flags?: string[] | null
  drink_from?: number | null
  drink_until?: number | null
  description?: string | null
}

export interface CreateVintageRatingsBatchPayload {
  source_id: string
  region_id?: string | null
  appellation_id?: string | null
  rows: VintageRatingRowInput[]
}

function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(error.message)
}

/* ----------------------------- SOURCES ----------------------------- */

export async function listVintageRatingSources() {
  const client = getSupabaseClient()

  const { data, error } = await client.from('vintage_rating_sources').select('*').order('name')

  throwIfError(error)
  return data as VintageRatingSourceRecord[]
}

export async function createVintageRatingSource(payload: CreateVintageRatingSourcePayload) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('vintage_rating_sources')
    .insert(payload)
    .select()
    .single()

  throwIfError(error)
  return data as VintageRatingSourceRecord
}

export async function updateVintageRatingSource(
  id: string,
  payload: UpdateVintageRatingSourcePayload,
) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('vintage_rating_sources')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return data as VintageRatingSourceRecord
}

export async function deleteVintageRatingSource(id: string) {
  const client = getSupabaseClient()

  const { error } = await client.from('vintage_rating_sources').delete().eq('id', id)

  throwIfError(error)
}

/* ----------------------------- RATINGS ----------------------------- */

export async function listVintageRatings(params?: {
  source_id?: string
  region_id?: string
  appellation_id?: string
  year?: number
}) {
  const client = getSupabaseClient()

  let query = client.from('vintage_ratings').select('*')

  if (params?.source_id) query = query.eq('source_id', params.source_id)
  if (params?.region_id) query = query.eq('region_id', params.region_id)
  if (params?.appellation_id) query = query.eq('appellation_id', params.appellation_id)
  if (params?.year) query = query.eq('year', params.year)

  const { data, error } = await query.order('year', { ascending: false })

  throwIfError(error)
  return data as VintageRatingRecord[]
}

export async function createVintageRating(payload: CreateVintageRatingPayload) {
  const client = getSupabaseClient()

  const { data, error } = await client.from('vintage_ratings').insert(payload).select().single()

  throwIfError(error)
  return data as VintageRatingRecord
}

export async function updateVintageRating(id: string, payload: UpdateVintageRatingPayload) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('vintage_ratings')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return data as VintageRatingRecord
}

export async function deleteVintageRating(id: string) {
  const client = getSupabaseClient()

  const { error } = await client.from('vintage_ratings').delete().eq('id', id)

  throwIfError(error)
}

/* -------------------------- BATCH CREATE --------------------------- */

export async function createVintageRatingsBatch(payload: CreateVintageRatingsBatchPayload) {
  const client = getSupabaseClient()

  const entries = payload.rows.map((row) => ({
    ...row,
    source_id: payload.source_id,
    region_id: payload.region_id ?? null,
    appellation_id: payload.appellation_id ?? null,
  }))

  const { data, error } = await client.from('vintage_ratings').insert(entries, {
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
  const client = getSupabaseClient()

  const { region_id, appellation_id } = params

  const { data, error } = await client
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
    const sourceName = row.source.name

    if (!grouped.has(sourceId)) {
      grouped.set(sourceId, {
        source_id: sourceId,
        source_name: sourceName,
        ratings: [],
      })
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

  // Merge per source (appellation overrides region)
  for (const group of grouped.values()) {
    const byYear = new Map<number, MergedVintageRating>()

    for (const rating of group.ratings) {
      const existing = byYear.get(rating.year)

      if (!existing || existing.fallback) {
        byYear.set(rating.year, rating)
      }
    }

    group.ratings = Array.from(byYear.values()).sort((a, b) => b.year - a.year)
  }

  return Array.from(grouped.values())
}
