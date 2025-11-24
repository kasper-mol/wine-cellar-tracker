import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'
import type { WineRegionRecord } from '@/services/wineRegions'

export interface WineAppellationRecord {
  id: string
  name: string
  region_id: string
  created_at: string
  updated_at: string
  region?: WineRegionRecord | null
}

export interface CreateWineAppellationPayload {
  name: string
  region_id: string
}

export interface UpdateWineAppellationPayload {
  name?: string
  region_id?: string
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

const SELECT_COLUMNS =
  'id, name, region_id, created_at, updated_at, region:wine_regions(id, name, country_id, created_at, updated_at, country:wine_countries(*))'

export async function fetchWineAppellations() {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_appellations')
    .select(SELECT_COLUMNS)
    .order('name')
  throwIfError(error)
  return (data ?? []) as unknown as WineAppellationRecord[]
}

export async function createWineAppellation(payload: CreateWineAppellationPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_appellations')
    .insert({
      name: payload.name.trim(),
      region_id: payload.region_id,
    })
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  return data as unknown as WineAppellationRecord
}

export async function updateWineAppellation(id: string, payload: UpdateWineAppellationPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_appellations')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.region_id !== undefined ? { region_id: payload.region_id } : {}),
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  return data as unknown as WineAppellationRecord
}

export async function deleteWineAppellation(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wine_appellations').delete().eq('id', id)
  throwIfError(error)
}
