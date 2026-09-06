import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type { WineCreatePayload, WineRecord, WineUpdatePayload } from '@/types/wines'

/** Column list that embeds the related region/appellation display names. */
const WINE_SELECT = `*,
  region_info:wine_regions!wines_region_fkey(id, name),
  appellation_info:wine_appellations!wines_appelation_fkey(id, name),
  wine_grapes(grape:grape_varieties(id, name, color))`

export async function fetchUserWines(): Promise<WineRecord[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wines')
    .select(WINE_SELECT)
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as unknown as WineRecord[]
}

async function fetchWine(id: string): Promise<WineRecord> {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wines').select(WINE_SELECT).eq('id', id).single()
  throwIfError(error)
  return data as unknown as WineRecord
}

/** Replace a wine's grape links with exactly `grapeIds`. */
async function replaceWineGrapes(wineId: string, grapeIds: string[]): Promise<void> {
  const db = getSupabaseClient()
  const unique = [...new Set(grapeIds)]

  const { error: deleteError } = await db.from('wine_grapes').delete().eq('wine_id', wineId)
  throwIfError(deleteError)

  if (!unique.length) return
  const { error: insertError } = await db
    .from('wine_grapes')
    .insert(unique.map((grapeId) => ({ wine_id: wineId, grape_id: grapeId })))
  throwIfError(insertError)
}

export async function createWine(
  payload: WineCreatePayload,
  grapeIds: string[] = [],
): Promise<WineRecord> {
  const db = getSupabaseClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await db
    .from('wines')
    .insert({ ...payload, user_id: user.id })
    .select('id')
    .single()
  throwIfError(error)

  const created = data as unknown as { id: string }
  if (grapeIds.length) await replaceWineGrapes(created.id, grapeIds)
  return fetchWine(created.id)
}

export async function updateWine(
  id: string,
  payload: WineUpdatePayload,
  grapeIds?: string[],
): Promise<WineRecord> {
  const db = getSupabaseClient()
  const { error } = await db.from('wines').update(payload).eq('id', id).select('id').single()
  throwIfError(error)

  if (grapeIds) await replaceWineGrapes(id, grapeIds)
  return fetchWine(id)
}

export async function deleteWine(id: string): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('wines').delete().eq('id', id)
  throwIfError(error)
}
