import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

export type GrapeColor = 'red' | 'white' | 'rose'

export interface GrapeVarietyRecord {
  id: string
  name: string
  color: GrapeColor | null
  description: string | null
  created_at: string
  updated_at: string
  image_url: string | null
}

export interface CreateGrapeVarietyPayload {
  name: string
  color?: GrapeColor | null
  description?: string | null
  imageFile?: File | null
}

export interface UpdateGrapeVarietyPayload {
  name?: string
  color?: GrapeColor | null
  description?: string | null
  imageFile?: File | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(error?.message)
}

export async function fetchGrapeVarieties() {
  const client = getSupabaseClient()
  const { data, error } = await client.from('grape_varieties').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as GrapeVarietyRecord[]
}

export async function createGrapeVariety(payload: CreateGrapeVarietyPayload) {
  const supabase = getSupabaseClient()
  const { data: created, error } = await supabase
    .from('grape_varieties')
    .insert({
      name: payload.name.trim(),
      color: payload.color ?? null,
      description: payload.description?.trim() || null,
    })
    .select()
    .single()

  if (error) throw error

  if (payload.imageFile) {
    const ext = payload.imageFile.name.split('.').pop()
    const filePath = `grapes/${created.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('grape-images')
      .upload(filePath, payload.imageFile, { upsert: true })
    if (uploadError) {
      await supabase.from('grape_varieties').delete().eq('id', created.id)
      throw uploadError
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from('grape-images').getPublicUrl(filePath)
    const { error: updateError } = await supabase
      .from('grape_varieties')
      .update({ image_url: publicUrl })
      .eq('id', created.id)
    if (updateError) {
      await supabase.from('grape_varieties').delete().eq('id', created.id)
      throw updateError
    }
    return { ...created, image_url: publicUrl } as GrapeVarietyRecord
  }

  return { ...created, image_url: null } as GrapeVarietyRecord
}

export async function updateGrapeVariety(id: string, payload: UpdateGrapeVarietyPayload) {
  const supabase = getSupabaseClient()
  let image_url: string | null = null

  if (payload.imageFile) {
    const ext = payload.imageFile.name.split('.').pop()
    const filePath = `grapes/${id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('grape-images')
      .upload(filePath, payload.imageFile, { upsert: true })
    if (uploadError) throw uploadError
    const {
      data: { publicUrl },
    } = supabase.storage.from('grape-images').getPublicUrl(filePath)
    image_url = publicUrl
  }

  const { data, error } = await supabase
    .from('grape_varieties')
    .update({
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.color !== undefined ? { color: payload.color ?? null } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
      ...(image_url ? { image_url } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  throwIfError(error)
  return data as GrapeVarietyRecord
}

export async function deleteGrapeVariety(id: string) {
  const client = getSupabaseClient()
  await client.storage.from('grape-images').remove([`grapes/${id}.jpg`])
  const { error } = await client.from('grape_varieties').delete().eq('id', id)
  throwIfError(error)
}
