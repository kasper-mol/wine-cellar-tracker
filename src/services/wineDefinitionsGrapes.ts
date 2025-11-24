import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

export interface WineDefinitionGrapeRecord {
  id: string
  wine_definition_id: string
  grape_id: string
  min_pct: number | null
  max_pct: number | null
  required: boolean
  created_at: string
  updated_at: string
}

export interface CreateWineDefinitionGrapePayload {
  wine_definition_id: string
  grape_id: string
  min_pct?: number | null
  max_pct?: number | null
  required?: boolean
}

export interface UpdateWineDefinitionGrapePayload
  extends Partial<CreateWineDefinitionGrapePayload> {}

export async function listGrapesForDefinition(
  wine_definition_id: string,
): Promise<{ data: WineDefinitionGrapeRecord[] | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  return supabase
    .from('wine_definition_grapes')
    .select('*')
    .eq('wine_definition_id', wine_definition_id)
    .order('created_at')
}

export async function addGrapeToDefinition(
  payload: CreateWineDefinitionGrapePayload,
): Promise<{ data: WineDefinitionGrapeRecord | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  return supabase.from('wine_definition_grapes').insert(payload).select().single()
}

export async function updateGrapeInDefinition(
  id: string,
  payload: UpdateWineDefinitionGrapePayload,
): Promise<{ data: WineDefinitionGrapeRecord | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  return supabase.from('wine_definition_grapes').update(payload).eq('id', id).select().single()
}

export async function deleteGrapeFromDefinition(
  id: string,
): Promise<{ error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('wine_definition_grapes').delete().eq('id', id)
  return { error }
}
