import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  FlavorDescriptorCreatePayload,
  FlavorDescriptorRecord,
  FlavorLevel,
  FlavorDescriptorUpdatePayload,
} from '@/types/flavorDescriptors'

export async function fetchFlavorDescriptors(params?: { level?: FlavorLevel; category?: string }) {
  const db = getSupabaseClient()
  let query = db.from('flavor_descriptors').select('*')
  if (params?.level) query = query.eq('level', params.level)
  if (params?.category) query = query.eq('category', params.category)
  const { data, error } = await query.order('level').order('name')
  throwIfError(error)
  return (data ?? []) as FlavorDescriptorRecord[]
}

export async function createFlavorDescriptor(payload: FlavorDescriptorCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('flavor_descriptors').insert(payload).select().single()
  throwIfError(error)
  return data as FlavorDescriptorRecord
}

export async function updateFlavorDescriptor(id: string, payload: FlavorDescriptorUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('flavor_descriptors')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as FlavorDescriptorRecord
}

export async function deleteFlavorDescriptor(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('flavor_descriptors').delete().eq('id', id)
  throwIfError(error)
}
