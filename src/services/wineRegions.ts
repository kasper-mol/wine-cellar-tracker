import type { PostgrestError } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/lib/supabase'
import type { WineCountryRecord } from '@/services/wineCountries'

export interface WineRegionRecord {
  id: string
  name: string
  country_id: string
  image_url: string | null
  created_at: string
  updated_at: string
  country?: WineCountryRecord | null
}

export interface CreateWineRegionPayload {
  name: string
  country_id: string
  imageFile?: File | null
}

export interface UpdateWineRegionPayload {
  name?: string
  country_id?: string
  imageFile?: File | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchWineRegions() {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_regions')
    .select('id, name, country_id, image_url, created_at, updated_at, country:wine_countries(*)')
    .order('name')
  throwIfError(error)
  return (data ?? []) as unknown as WineRegionRecord[]
}

export async function createWineRegion(payload: CreateWineRegionPayload) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('wine_regions')
    .insert({
      name: payload.name.trim(),
      country_id: payload.country_id,
    })
    .select('id, name, country_id, image_url, created_at, updated_at, country:wine_countries(*)')
    .single()
  throwIfError(error)

  if (!payload.imageFile) {
    return data as unknown as WineRegionRecord
  }

  const ext = payload.imageFile.name.split('.').pop() || 'jpg'
  const filePath = `regions/${data.id}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('region-images')
    .upload(filePath, payload.imageFile, { upsert: true })
  if (uploadError) {
    await supabase.from('wine_regions').delete().eq('id', data.id)
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('region-images').getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('wine_regions')
    .update({ image_url: publicUrl })
    .eq('id', data.id)
  if (updateError) {
    await supabase.from('wine_regions').delete().eq('id', data.id)
    throw updateError
  }

  return { ...(data as WineRegionRecord), image_url: publicUrl }
}

export async function updateWineRegion(id: string, payload: UpdateWineRegionPayload) {
  const supabase = getSupabaseClient()
  let image_url: string | null = null

  if (payload.imageFile) {
    const ext = payload.imageFile.name.split('.').pop() || 'jpg'
    const filePath = `regions/${id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('region-images')
      .upload(filePath, payload.imageFile, { upsert: true })
    if (uploadError) throw uploadError
    const {
      data: { publicUrl },
    } = supabase.storage.from('region-images').getPublicUrl(filePath)
    image_url = publicUrl
  }

  const { data, error } = await supabase
    .from('wine_regions')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.country_id !== undefined ? { country_id: payload.country_id } : {}),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select('id, name, country_id, image_url, created_at, updated_at, country:wine_countries(*)')
    .single()
  throwIfError(error)
  return data as unknown as WineRegionRecord
}

export async function deleteWineRegion(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wine_regions').delete().eq('id', id)
  throwIfError(error)
}
