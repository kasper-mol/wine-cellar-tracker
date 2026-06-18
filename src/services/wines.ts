import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type { WineCreatePayload, WineRecord, WineUpdatePayload } from '@/types/wines'

export async function fetchUserWines(): Promise<WineRecord[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wines')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as WineRecord[]
}

export async function createWine(payload: WineCreatePayload): Promise<WineRecord> {
  const db = getSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await db
    .from('wines')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  throwIfError(error)
  return data as WineRecord
}

export async function updateWine(id: string, payload: WineUpdatePayload): Promise<WineRecord> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wines')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as WineRecord
}

export async function deleteWine(id: string): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('wines').delete().eq('id', id)
  throwIfError(error)
}
