import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  FlavorClusterCreatePayload,
  FlavorClusterRecord,
  FlavorClusterUpdatePayload,
  FlavorDescriptorCreatePayload,
  FlavorDescriptorRecord,
  FlavorDescriptorUpdatePayload,
  FlavorLevel,
} from '@/types/flavorDescriptors'

// Clusters -------------------------------------------------------------------

export async function fetchFlavorClusters(params?: { level?: FlavorLevel }) {
  const db = getSupabaseClient()
  let query = db.from('flavor_clusters').select('*')
  if (params?.level) query = query.eq('level', params.level)
  const { data, error } = await query.order('level').order('sort_order').order('name')
  throwIfError(error)
  return (data ?? []) as FlavorClusterRecord[]
}

export async function createFlavorCluster(payload: FlavorClusterCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('flavor_clusters').insert(payload).select().single()
  throwIfError(error)
  return data as FlavorClusterRecord
}

export async function updateFlavorCluster(id: string, payload: FlavorClusterUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('flavor_clusters')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as FlavorClusterRecord
}

export async function deleteFlavorCluster(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('flavor_clusters').delete().eq('id', id)
  throwIfError(error)
}

// Descriptors ----------------------------------------------------------------

export async function fetchFlavorDescriptors(params?: { clusterId?: string }) {
  const db = getSupabaseClient()
  let query = db.from('flavor_descriptors').select('*')
  if (params?.clusterId) query = query.eq('cluster_id', params.clusterId)
  const { data, error } = await query.order('cluster_id').order('sort_order').order('name')
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
