import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { entityImagePath, uploadEntityImage } from '@/lib/storage'
import type {
  WineCountryCreatePayload,
  WineCountryRecord,
  WineCountryUpdatePayload,
} from '@/types/wineCountries'

export async function fetchWineCountries() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wine_countries').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as WineCountryRecord[]
}

export async function createWineCountry(payload: WineCountryCreatePayload) {
  const db = getSupabaseClient()
  const { data: created, error } = await db
    .from('wine_countries')
    .insert({ name: payload.name.trim(), code: payload.code?.trim() || null })
    .select()
    .single()
  throwIfError(error)

  if (!payload.imageFile) return created as WineCountryRecord

  const path = entityImagePath('countries', created.id, payload.imageFile.name)
  let publicUrl: string
  try {
    publicUrl = await uploadEntityImage('country-images', path, payload.imageFile)
  } catch (err) {
    await db.from('wine_countries').delete().eq('id', created.id)
    throw err
  }

  const { error: updateError } = await db
    .from('wine_countries')
    .update({ image_url: publicUrl })
    .eq('id', created.id)
  if (updateError) {
    await db.from('wine_countries').delete().eq('id', created.id)
    throw updateError
  }

  return { ...(created as WineCountryRecord), image_url: publicUrl }
}

export async function updateWineCountry(id: string, payload: WineCountryUpdatePayload) {
  const db = getSupabaseClient()

  let image_url: string | null = null
  if (payload.imageFile) {
    const path = entityImagePath('countries', id, payload.imageFile.name)
    image_url = await uploadEntityImage('country-images', path, payload.imageFile)
  }

  const { data, error } = await db
    .from('wine_countries')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.code !== undefined ? { code: payload.code?.trim() || null } : {}),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as WineCountryRecord
}

export async function deleteWineCountry(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_countries').delete().eq('id', id)
  throwIfError(error)
}
