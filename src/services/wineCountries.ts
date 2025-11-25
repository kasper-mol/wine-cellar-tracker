import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'

export interface WineCountryRecord {
  id: string
  name: string
  code: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface CreateWineCountryPayload {
  name: string
  code?: string | null
  imageFile?: File | null
}

export interface UpdateWineCountryPayload {
  name?: string
  code?: string | null
  imageFile?: File | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchWineCountries() {
  const client = getSupabaseClient()
  const { data, error } = await client.from('wine_countries').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as WineCountryRecord[]
}

export async function createWineCountry(payload: CreateWineCountryPayload) {
  const supabase = getSupabaseClient()
  const { data: created, error } = await supabase
    .from('wine_countries')
    .insert({
      name: payload.name.trim(),
      code: payload.code?.trim() || null,
    })
    .select()
    .single()
  throwIfError(error)

  if (!payload.imageFile) {
    return created as WineCountryRecord
  }

  const ext = payload.imageFile.name.split('.').pop() || 'jpg'
  const filePath = `countries/${created.id}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('country-images')
    .upload(filePath, payload.imageFile, { upsert: true })
  if (uploadError) {
    await supabase.from('wine_countries').delete().eq('id', created.id)
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('country-images').getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('wine_countries')
    .update({ image_url: publicUrl })
    .eq('id', created.id)
  if (updateError) {
    await supabase.from('wine_countries').delete().eq('id', created.id)
    throw updateError
  }

  return { ...(created as WineCountryRecord), image_url: publicUrl }
}

export async function updateWineCountry(id: string, payload: UpdateWineCountryPayload) {
  const supabase = getSupabaseClient()
  let image_url: string | null = null

  if (payload.imageFile) {
    const ext = payload.imageFile.name.split('.').pop() || 'jpg'
    const filePath = `countries/${id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('country-images')
      .upload(filePath, payload.imageFile, { upsert: true })
    if (uploadError) throw uploadError
    const {
      data: { publicUrl },
    } = supabase.storage.from('country-images').getPublicUrl(filePath)
    image_url = publicUrl
  }

  const { data, error } = await supabase
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
  const client = getSupabaseClient()
  const { error } = await client.from('wine_countries').delete().eq('id', id)
  throwIfError(error)
}
