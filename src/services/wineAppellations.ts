import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { entityImagePath, uploadEntityImage } from '@/lib/storage'
import type {
  WineAppellationCreatePayload,
  WineAppellationRecord,
  WineAppellationUpdatePayload,
} from '@/types/wineAppellations'

const SELECT_COLUMNS = [
  'id',
  'name',
  'description',
  'image_url',
  'region_id',
  'created_at',
  'updated_at',
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

export async function createWineAppellation(payload: WineAppellationCreatePayload) {
  const db = getSupabaseClient()
  const { data: created, error } = await db
    .from('wine_appellations')
    .insert({
      name: payload.name.trim(),
      region_id: payload.region_id,
      description:
        payload.description === null
          ? null
          : payload.description !== undefined
            ? payload.description.trim() || null
            : null,
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
      ...(payload.description !== undefined
        ? { description: payload.description === null ? null : payload.description.trim() || null }
        : {}),
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
