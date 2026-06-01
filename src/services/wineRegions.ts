import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { entityImagePath, uploadEntityImage } from '@/lib/storage'
import type {
  WineRegionCreatePayload,
  WineRegionRecord,
  WineRegionUpdatePayload,
} from '@/types/wineRegions'

const SELECT_COLUMNS =
  'id, name, country_id, image_url, created_at, updated_at, country:wine_countries(*)'

export async function fetchWineRegions() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wine_regions').select(SELECT_COLUMNS).order('name')
  throwIfError(error)
  return (data ?? []) as unknown as WineRegionRecord[]
}

export async function createWineRegion(payload: WineRegionCreatePayload) {
  const db = getSupabaseClient()
  const { data: created, error } = await db
    .from('wine_regions')
    .insert({ name: payload.name.trim(), country_id: payload.country_id })
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  if (!created) throw new Error('Failed to create wine region')

  if (!payload.imageFile) return created as unknown as WineRegionRecord

  const path = entityImagePath('regions', created.id, payload.imageFile.name)
  let publicUrl: string
  try {
    publicUrl = await uploadEntityImage('region-images', path, payload.imageFile)
  } catch (err) {
    await db.from('wine_regions').delete().eq('id', created.id)
    throw err
  }

  const { error: updateError } = await db
    .from('wine_regions')
    .update({ image_url: publicUrl })
    .eq('id', created.id)
  if (updateError) {
    await db.from('wine_regions').delete().eq('id', created.id)
    throw updateError
  }

  return { ...(created as unknown as WineRegionRecord), image_url: publicUrl }
}

export async function updateWineRegion(id: string, payload: WineRegionUpdatePayload) {
  const db = getSupabaseClient()

  let image_url: string | null = null
  if (payload.imageFile) {
    const path = entityImagePath('regions', id, payload.imageFile.name)
    image_url = await uploadEntityImage('region-images', path, payload.imageFile)
  }

  const { data, error } = await db
    .from('wine_regions')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.country_id !== undefined ? { country_id: payload.country_id } : {}),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  if (!data) throw new Error('Failed to update wine region')
  return data as unknown as WineRegionRecord
}

export async function deleteWineRegion(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_regions').delete().eq('id', id)
  throwIfError(error)
}
