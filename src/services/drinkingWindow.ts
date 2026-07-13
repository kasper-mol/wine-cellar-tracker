import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  ArchetypeRecord,
  ArchetypeCreatePayload,
  ArchetypeUpdatePayload,
  ArchetypeMappingRecord,
  ProducerTierRecord,
  ProducerTierCreatePayload,
  ProducerTierUpdatePayload,
  HotVintageRecord,
  HotVintageCreatePayload,
  SettingsRecord,
  SettingsUpdatePayload,
} from '@/types/drinkingWindow'

/* ----------------------------- archetypes ----------------------------- */

export async function fetchArchetypes() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_archetypes').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as ArchetypeRecord[]
}

export async function createArchetype(payload: ArchetypeCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_archetypes').insert(payload).select().single()
  throwIfError(error)
  return data as ArchetypeRecord
}

export async function deleteArchetype(id: string) {
  const db = getSupabaseClient()
  // Delete associated mappings first to avoid FK violation
  const { error: mapError } = await db.from('dw_archetype_mappings').delete().eq('archetype_id', id)
  throwIfError(mapError)
  const { error } = await db.from('dw_archetypes').delete().eq('id', id)
  throwIfError(error)
}

export async function updateArchetype(id: string, payload: ArchetypeUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dw_archetypes')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as ArchetypeRecord
}

/* --------------------------- archetype mappings --------------------------- */

export async function fetchArchetypeMappings() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_archetype_mappings').select('*')
  throwIfError(error)
  return (data ?? []) as ArchetypeMappingRecord[]
}

/** Set (or clear, when archetypeId is null) the archetype for one appellation. */
export async function setAppellationMapping(appellationId: string, archetypeId: string | null) {
  const db = getSupabaseClient()
  const del = await db.from('dw_archetype_mappings').delete().eq('appellation_id', appellationId)
  throwIfError(del.error)
  if (!archetypeId) return null
  const { data, error } = await db
    .from('dw_archetype_mappings')
    .insert({ appellation_id: appellationId, region_id: null, archetype_id: archetypeId })
    .select()
    .single()
  throwIfError(error)
  return data as ArchetypeMappingRecord
}

/** Set (or clear) the archetype for one region. */
export async function setRegionMapping(regionId: string, archetypeId: string | null) {
  const db = getSupabaseClient()
  const del = await db.from('dw_archetype_mappings').delete().eq('region_id', regionId)
  throwIfError(del.error)
  if (!archetypeId) return null
  const { data, error } = await db
    .from('dw_archetype_mappings')
    .insert({ region_id: regionId, appellation_id: null, archetype_id: archetypeId })
    .select()
    .single()
  throwIfError(error)
  return data as ArchetypeMappingRecord
}

/* ----------------------------- producer tiers ----------------------------- */

export async function fetchProducerTiers() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_producer_tiers').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as ProducerTierRecord[]
}

export async function createProducerTier(payload: ProducerTierCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_producer_tiers').insert(payload).select().single()
  throwIfError(error)
  return data as ProducerTierRecord
}

export async function updateProducerTier(id: string, payload: ProducerTierUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dw_producer_tiers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as ProducerTierRecord
}

export async function deleteProducerTier(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('dw_producer_tiers').delete().eq('id', id)
  throwIfError(error)
}

/* ------------------------------ hot vintages ------------------------------ */

export async function fetchHotVintages() {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dw_hot_vintages')
    .select('*')
    .order('year', { ascending: false })
  throwIfError(error)
  return (data ?? []) as HotVintageRecord[]
}

export async function createHotVintage(payload: HotVintageCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_hot_vintages').insert(payload).select().single()
  throwIfError(error)
  return data as HotVintageRecord
}

export async function deleteHotVintage(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('dw_hot_vintages').delete().eq('id', id)
  throwIfError(error)
}

/* -------------------------------- settings -------------------------------- */

export async function fetchSettings() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dw_settings').select('*').eq('id', 'default').single()
  throwIfError(error)
  return data as SettingsRecord
}

export async function updateSettings(payload: SettingsUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dw_settings')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', 'default')
    .select()
    .single()
  throwIfError(error)
  return data as SettingsRecord
}
