import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  AppellationStyleProfileInput,
  AppellationStyleProfileRecord,
} from '@/types/appellationStyleProfiles'

export async function fetchAppellationStyleProfiles(appellationId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_style_profiles')
    .select('*')
    .eq('appellation_id', appellationId)
  throwIfError(error)
  return (data ?? []) as AppellationStyleProfileRecord[]
}

export async function upsertAppellationStyleProfile(payload: AppellationStyleProfileInput) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_style_profiles')
    .upsert(payload, { onConflict: 'appellation_id,wine_style' })
    .select()
    .single()
  throwIfError(error)
  return data as AppellationStyleProfileRecord
}

export async function deleteAppellationStyleProfile(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('appellation_style_profiles').delete().eq('id', id)
  throwIfError(error)
}
