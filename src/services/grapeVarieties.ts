import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { entityImagePath, uploadEntityImage } from '@/lib/storage'
import type {
  GrapeVarietyCreatePayload,
  GrapeVarietyRecord,
  GrapeVarietyUpdatePayload,
} from '@/types/grapeVarieties'

export async function fetchGrapeVarieties() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('grape_varieties').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as GrapeVarietyRecord[]
}

export async function createGrapeVariety(payload: GrapeVarietyCreatePayload) {
  const db = getSupabaseClient()
  const { data: created, error } = await db
    .from('grape_varieties')
    .insert({
      name: payload.name.trim(),
      color: payload.color ?? null,
      description: payload.description?.trim() || null,
    })
    .select()
    .single()
  throwIfError(error)

  if (!payload.imageFile) return { ...created, image_url: null } as GrapeVarietyRecord

  const path = entityImagePath('grapes', created.id, payload.imageFile.name)
  let publicUrl: string
  try {
    publicUrl = await uploadEntityImage('grape-images', path, payload.imageFile)
  } catch (err) {
    await db.from('grape_varieties').delete().eq('id', created.id)
    throw err
  }

  const { error: updateError } = await db
    .from('grape_varieties')
    .update({ image_url: publicUrl })
    .eq('id', created.id)
  if (updateError) {
    await db.from('grape_varieties').delete().eq('id', created.id)
    throw updateError
  }

  return { ...created, image_url: publicUrl } as GrapeVarietyRecord
}

export async function updateGrapeVariety(id: string, payload: GrapeVarietyUpdatePayload) {
  const db = getSupabaseClient()

  let image_url: string | null = null
  if (payload.imageFile) {
    const path = entityImagePath('grapes', id, payload.imageFile.name)
    image_url = await uploadEntityImage('grape-images', path, payload.imageFile)
  }

  const { data, error } = await db
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
  const db = getSupabaseClient()
  await db.storage.from('grape-images').remove([`grapes/${id}.jpg`])
  const { error } = await db.from('grape_varieties').delete().eq('id', id)
  throwIfError(error)
}
