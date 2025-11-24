import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'

export interface WineCountryRecord {
  id: string
  name: string
  code: string | null
  created_at: string
  updated_at: string
}

export interface CreateWineCountryPayload {
  name: string
  code?: string | null
}

export interface UpdateWineCountryPayload {
  name?: string
  code?: string | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchWineCountries() {
  const client = getSupabaseClient()
  const { data, error } = await client.from('wine_countries').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as WineCountryRecord[]
}

export async function createWineCountry(payload: CreateWineCountryPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_countries')
    .insert({
      name: payload.name.trim(),
      code: payload.code?.trim() || null,
    })
    .select()
    .single()
  throwIfError(error)
  return data as WineCountryRecord
}

export async function updateWineCountry(id: string, payload: UpdateWineCountryPayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_countries')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.code !== undefined ? { code: payload.code?.trim() || null } : {}),
    })
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as WineCountryRecord
}

export async function deleteWineCountry(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wine_countries').delete().eq('id', id)
  throwIfError(error)
}
