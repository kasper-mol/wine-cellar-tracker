import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type { WineCreatePayload, WineRecord, WineUpdatePayload } from '@/types/wines'

export async function fetchWines() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wines').select('*')
  throwIfError(error)
  return (data ?? []) as WineRecord[]
}

export async function createWine(payload: WineCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wines').insert(payload).select().single()
  throwIfError(error)
  return data as WineRecord
}

export async function updateWine(id: string, payload: WineUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wines').update(payload).eq('id', id).select().single()
  throwIfError(error)
  return data as WineRecord
}

export async function deleteWine(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('wines').delete().eq('id', id)
  throwIfError(error)
}
