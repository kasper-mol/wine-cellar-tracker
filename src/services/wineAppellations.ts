import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { entityImagePath, uploadEntityImage } from '@/lib/storage'
import type {
  WineAppellationCopyInput,
  WineAppellationCreatePayload,
  WineAppellationRecord,
  WineAppellationUpdatePayload,
} from '@/types/wineAppellations'

const COPY_FIELDS = [
  'short_description',
  'description',
  'pronunciation',
  'classification',
  'established_year',
  'signature_grapes',
  'wine_styles',
  'style_summary',
  'climate_soil',
  'food_pairings',
  'drinking_window',
  'fun_fact',
  'copy_status',
] as const satisfies readonly (keyof WineAppellationCopyInput)[]

/** Only the copy keys actually present are written, so an untouched field keeps its batch value. */
function copyColumns(payload: WineAppellationCopyInput) {
  const columns: Record<string, unknown> = {}
  for (const field of COPY_FIELDS) {
    if (payload[field] !== undefined) columns[field] = payload[field]
  }
  if (Object.keys(columns).length > 0) columns.copy_updated_at = new Date().toISOString()
  return columns
}

const SELECT_COLUMNS = [
  'id',
  'name',
  'description',
  'image_url',
  'region_id',
  'established_year',
  'created_at',
  'updated_at',
  'short_description',
  'pronunciation',
  'classification',
  'signature_grapes',
  'wine_styles',
  'style_summary',
  'climate_soil',
  'food_pairings',
  'drinking_window',
  'fun_fact',
  'copy_status',
  'copy_updated_at',
  'region:wine_regions(id, name, country_id, created_at, updated_at, country:wine_countries(*))',
  `grapes:grape_appellations(
    id,
    appellation_id,
    grape_id,
    rule,
    min_pct,
    max_pct,
    created_at,
    updated_at,
    grape:grape_varieties(*)
  )`,
].join(', ')

export async function fetchWineAppellations() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wine_appellations').select(SELECT_COLUMNS).order('name')
  throwIfError(error)
  return (data ?? []) as unknown as WineAppellationRecord[]
}

const LEAN_SELECT =
  'id, name, region_id, short_description, region:wine_regions(id, name, country_id)'

type LeanAppellation = Pick<
  WineAppellationRecord,
  'id' | 'name' | 'region_id' | 'short_description' | 'region'
>

/** Lean fetch by region — no grapes join, used by mappings page. */
export async function fetchAppellationsByRegion(regionId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_appellations')
    .select(LEAN_SELECT)
    .eq('region_id', regionId)
    .order('name')
  throwIfError(error)
  return (data ?? []) as unknown as LeanAppellation[]
}

/** Lean fetch by country — resolves region IDs first, then filters. No grapes join. */
export async function fetchAppellationsByCountry(countryId: string) {
  const db = getSupabaseClient()
  // Step 1: get region IDs for this country
  const { data: regionRows, error: regionError } = await db
    .from('wine_regions')
    .select('id')
    .eq('country_id', countryId)
  throwIfError(regionError)
  const regionIds = (regionRows ?? []).map((r: { id: string }) => r.id)
  if (regionIds.length === 0) return []
  // Step 2: fetch appellations in those regions
  const { data, error } = await db
    .from('wine_appellations')
    .select(LEAN_SELECT)
    .in('region_id', regionIds)
    .order('name')
  throwIfError(error)
  return (data ?? []) as unknown as LeanAppellation[]
}

export async function createWineAppellation(payload: WineAppellationCreatePayload) {
  const db = getSupabaseClient()
  const { data: created, error } = await db
    .from('wine_appellations')
    .insert({
      name: payload.name.trim(),
      region_id: payload.region_id,
      ...copyColumns(payload),
    })
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  if (!created) throw new Error('Failed to create wine appellation')

  const record = created as unknown as WineAppellationRecord
  if (!payload.imageFile) return record

  const path = entityImagePath('appellations', record.id, payload.imageFile.name)
  let publicUrl: string
  try {
    publicUrl = await uploadEntityImage('appellation-images', path, payload.imageFile)
  } catch (err) {
    await db.from('wine_appellations').delete().eq('id', record.id)
    throw err
  }

  const { error: updateError } = await db
    .from('wine_appellations')
    .update({ image_url: publicUrl })
    .eq('id', record.id)
  if (updateError) {
    await db.from('wine_appellations').delete().eq('id', record.id)
    throw updateError
  }

  return { ...record, image_url: publicUrl }
}

export async function updateWineAppellation(id: string, payload: WineAppellationUpdatePayload) {
  const db = getSupabaseClient()

  let image_url: string | null = null
  if (payload.imageFile) {
    const path = entityImagePath('appellations', id, payload.imageFile.name)
    image_url = await uploadEntityImage('appellation-images', path, payload.imageFile)
  }

  const { data, error } = await db
    .from('wine_appellations')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.region_id !== undefined ? { region_id: payload.region_id } : {}),
      ...copyColumns(payload),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  if (!data) throw new Error('Failed to update wine appellation')
  return data as unknown as WineAppellationRecord
}

export async function deleteWineAppellation(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_appellations').delete().eq('id', id)
  throwIfError(error)
}
