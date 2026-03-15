import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'
import type { WineCreatePayload, WineRecord, WineUpdatePayload } from '@/types/wines'

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchWines() {
  const client = getSupabaseClient()
  const { data, error } = await client.from('wines').select('*')
  throwIfError(error)
  return (data ?? []) as WineRecord[]
}

export async function createWine(payload: WineCreatePayload) {
  const client = getSupabaseClient()
  const { data, error } = await client.from('wines').insert(payload).select().single()

  throwIfError(error)
  return data as WineRecord
}

export async function updateWine(id: string, payload: WineUpdatePayload) {
  const client = getSupabaseClient()
  const { data, error } = await client.from('wines').update(payload).eq('id', id).select().single()

  throwIfError(error)
  return data as WineRecord
}

export async function deleteWine(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wines').delete().eq('id', id)
  throwIfError(error)
}
