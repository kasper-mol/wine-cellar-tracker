import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type {
  FlavorDescriptorCreatePayload,
  FlavorDescriptorRecord,
  FlavorLevel,
  FlavorDescriptorUpdatePayload,
} from '@/types/flavorDescriptors'

function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(error.message)
}

export async function fetchFlavorDescriptors(params?: { level?: FlavorLevel; category?: string }) {
  const client = getSupabaseClient()
  let query = client.from('flavor_descriptors').select('*')

  if (params?.level) query = query.eq('level', params.level)
  if (params?.category) query = query.eq('category', params.category)

  const { data, error } = await query.order('level').order('name')
  throwIfError(error)
  return (data ?? []) as FlavorDescriptorRecord[]
}

export async function createFlavorDescriptor(payload: FlavorDescriptorCreatePayload) {
  const client = getSupabaseClient()
  const { data, error } = await client.from('flavor_descriptors').insert(payload).select().single()
  throwIfError(error)
  return data as FlavorDescriptorRecord
}

export async function updateFlavorDescriptor(id: string, payload: FlavorDescriptorUpdatePayload) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('flavor_descriptors')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as FlavorDescriptorRecord
}

export async function deleteFlavorDescriptor(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('flavor_descriptors').delete().eq('id', id)
  throwIfError(error)
}
