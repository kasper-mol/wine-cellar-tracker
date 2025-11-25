import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

import type { WineRegionRecord } from '@/services/wineRegions'
import type { GrapeVarietyRecord } from '@/services/grapeVarieties'

export interface GrapeAppellationRule {
  id: string
  appellation_id: string
  grape_id: string
  rule: 'allowed' | 'required' | 'forbidden'
  min_pct: number | null
  max_pct: number | null
  created_at: string
  updated_at: string
  grape?: GrapeVarietyRecord | null
}

export interface WineAppellationRecord {
  id: string
  name: string
  region_id: string
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  region?: WineRegionRecord | null
  grapes?: GrapeAppellationRule[] | null
}

export interface CreateWineAppellationPayload {
  name: string
  region_id: string
  description?: string | null
  imageFile?: File | null
}

export interface UpdateWineAppellationPayload {
  name?: string
  region_id?: string
  description?: string | null
  imageFile?: File | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

const REGION_COLUMNS =
  'region:wine_regions(id, name, country_id, created_at, updated_at, country:wine_countries(*))'

const GRAPE_COLUMNS = `
  grapes:grape_appellations(
    id,
    appellation_id,
    grape_id,
    rule,
    min_pct,
    max_pct,
    created_at,
    updated_at,
    grape:grape_varieties(*)
  )
`

const SELECT_COLUMNS = [
  'id',
  'name',
  'description',
  'image_url',
  'region_id',
  'created_at',
  'updated_at',
  REGION_COLUMNS,
  GRAPE_COLUMNS,
].join(', ')

export async function fetchWineAppellations() {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('wine_appellations')
    .select(SELECT_COLUMNS)
    .order('name')

  throwIfError(error)
  return (data ?? []) as unknown as WineAppellationRecord[]
}

export async function createWineAppellation(payload: CreateWineAppellationPayload) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
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

  if (!payload.imageFile) {
    return data as unknown as WineAppellationRecord
  }

  const ext = payload.imageFile.name.split('.').pop() || 'jpg'
  const filePath = `appellations/${data.id}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('appellation-images')
    .upload(filePath, payload.imageFile, { upsert: true })
  if (uploadError) {
    await supabase.from('wine_appellations').delete().eq('id', data.id)
    throw uploadError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('appellation-images').getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('wine_appellations')
    .update({ image_url: publicUrl })
    .eq('id', data.id)
  if (updateError) {
    await supabase.from('wine_appellations').delete().eq('id', data.id)
    throw updateError
  }

  return { ...(data as WineAppellationRecord), image_url: publicUrl }
}

export async function updateWineAppellation(id: string, payload: UpdateWineAppellationPayload) {
  const supabase = getSupabaseClient()
  let image_url: string | null = null

  if (payload.imageFile) {
    const ext = payload.imageFile.name.split('.').pop() || 'jpg'
    const filePath = `appellations/${id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('appellation-images')
      .upload(filePath, payload.imageFile, { upsert: true })
    if (uploadError) throw uploadError
    const {
      data: { publicUrl },
    } = supabase.storage.from('appellation-images').getPublicUrl(filePath)
    image_url = publicUrl
  }

  const { data, error } = await supabase
    .from('wine_appellations')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.region_id !== undefined ? { region_id: payload.region_id } : {}),
      ...(payload.description !== undefined
        ? {
            description:
              payload.description === null ? null : payload.description.trim() || null,
          }
        : {}),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  return data as unknown as WineAppellationRecord
}

export async function deleteWineAppellation(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('wine_appellations').delete().eq('id', id)
  throwIfError(error)
}
