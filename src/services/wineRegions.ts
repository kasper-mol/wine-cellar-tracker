import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'
import type { WineCountryRecord } from '@/services/wineCountries'

export interface WineRegionRecord {
  id: string
  name: string
  country_id: string
  created_at: string
  updated_at: string
  country?: WineCountryRecord | null
}

export interface CreateWineRegionPayload {
  name: string
  country_id: string
}

export interface UpdateWineRegionPayload {
  name?: string
  country_id?: string
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchWineRegions() {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_regions')
    .select('id, name, country_id, created_at, updated_at, country:wine_countries(*)')
    .order('name')
  throwIfError(error)
  return (data ?? []) as unknown as WineRegionRecord[]
}

export async function createWineRegion(payload: CreateWineRegionPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_regions')
    .insert({
      name: payload.name.trim(),
      country_id: payload.country_id,
    })
    .select('id, name, country_id, created_at, updated_at, country:wine_countries(*)')
    .single()
  throwIfError(error)
  return data as unknown as WineRegionRecord
}

export async function updateWineRegion(id: string, payload: UpdateWineRegionPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_regions')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.country_id !== undefined ? { country_id: payload.country_id } : {}),
    })
    .eq('id', id)
    .select('id, name, country_id, created_at, updated_at, country:wine_countries(*)')
    .single()
  throwIfError(error)
  return data as unknown as WineRegionRecord
}

export async function deleteWineRegion(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wine_regions').delete().eq('id', id)
  throwIfError(error)
}
