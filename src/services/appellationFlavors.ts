import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  AppellationFlavorCreatePayload,
  AppellationFlavorRecord,
} from '@/types/appellationFlavors'

export async function fetchAppellationFlavors(appellationId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_flavors')
    .select('*')
    .eq('appellation_id', appellationId)
  throwIfError(error)
  return (data ?? []) as AppellationFlavorRecord[]
}

export async function createAppellationFlavor(payload: AppellationFlavorCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('appellation_flavors').insert(payload).select().single()
  throwIfError(error)
  return data as AppellationFlavorRecord
}

export async function deleteAppellationFlavor(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('appellation_flavors').delete().eq('id', id)
  throwIfError(error)
}
