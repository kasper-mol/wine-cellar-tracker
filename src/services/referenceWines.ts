import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  ReferenceWine,
  ReferenceWineCreatePayload,
  ReferenceWineUpdatePayload,
} from '@/types/referenceWines'

export async function fetchReferenceWines(): Promise<ReferenceWine[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('reference_wines')
    .select('*')
    .order('name')
  throwIfError(error)
  return (data ?? []) as ReferenceWine[]
}

export async function fetchReferenceWinesByRegion(regionId: string): Promise<ReferenceWine[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('reference_wines')
    .select('*')
    .eq('region_id', regionId)
    .order('name')
  throwIfError(error)
  return (data ?? []) as ReferenceWine[]
}

export async function fetchReferenceWinesByAppellation(appellationId: string): Promise<ReferenceWine[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('reference_wines')
    .select('*')
    .eq('appellation_id', appellationId)
    .order('name')
  throwIfError(error)
  return (data ?? []) as ReferenceWine[]
}

export async function fetchReferenceWinesByCountry(countryId: string): Promise<ReferenceWine[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('reference_wines')
    .select('*')
    .eq('country_id', countryId)
    .order('name')
  throwIfError(error)
  return (data ?? []) as ReferenceWine[]
}

export async function createReferenceWine(payload: ReferenceWineCreatePayload): Promise<ReferenceWine> {
  const db = getSupabaseClient()
  const { data, error } = await db.from('reference_wines').insert(payload).select().single()
  throwIfError(error)
  return data as ReferenceWine
}

export async function updateReferenceWine(id: string, payload: ReferenceWineUpdatePayload): Promise<ReferenceWine> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('reference_wines')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as ReferenceWine
}

export async function deleteReferenceWine(id: string): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('reference_wines').delete().eq('id', id)
  throwIfError(error)
}
