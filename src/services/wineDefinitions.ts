import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'

export interface WineDefinitionRecord {
  id: string
  name: string
  country_id: string | null
  region_id: string | null
  appellation_id: string | null
  description: string | null
  version: number
  rule_json: any
  created_at: string
  updated_at: string
}

export interface CreateWineDefinitionPayload {
  name: string
  country_id?: string | null
  region_id?: string | null
  appellation_id?: string | null
  description?: string | null
  version?: number
  rule_json?: any
}

export interface UpdateWineDefinitionPayload extends Partial<CreateWineDefinitionPayload> {}

// helper to keep only the most specific owner
function keepMostSpecificOwner<T extends CreateWineDefinitionPayload | UpdateWineDefinitionPayload>(
  payload: T,
): T {
  if (payload.appellation_id) {
    payload.region_id = null
    payload.country_id = null
  } else if (payload.region_id) {
    payload.country_id = null
  }
  return payload
}

// helper to resolve full hierarchy
function resolveHierarchy(row: any): WineDefinitionRecord {
  const country_id = row.appellation?.region?.country_id || row.region?.country_id || row.country_id

  const region_id = row.appellation?.region?.id || row.region?.id || row.region_id

  const appellation_id = row.appellation_id

  return {
    ...row,
    country_id,
    region_id,
    appellation_id,
  }
}

export async function listWineDefinitions(): Promise<{
  data: WineDefinitionRecord[] | null
  error: PostgrestError | null
}> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('wine_definitions')
    .select(
      `
      *,
      appellation:appellation_id (
        id,
        region:region_id (
          id,
          country_id
        )
      ),
      region:region_id (
        id,
        country_id
      )
    `,
    )
    .order('name')

  if (error || !data) return { data: null, error }

  return { data: data.map(resolveHierarchy), error: null }
}

export async function getWineDefinition(
  id: string,
): Promise<{ data: WineDefinitionRecord | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('wine_definitions')
    .select(
      `
      *,
      appellation:appellation_id (
        id,
        region:region_id (
          id,
          country_id
        )
      ),
      region:region_id (
        id,
        country_id
      )
    `,
    )
    .eq('id', id)
    .single()

  if (error || !data) return { data: null, error }
  return { data: resolveHierarchy(data), error: null }
}

export async function createWineDefinition(
  payload: CreateWineDefinitionPayload,
): Promise<{ data: WineDefinitionRecord | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  const filteredPayload = keepMostSpecificOwner(payload)
  const { data, error } = await supabase
    .from('wine_definitions')
    .insert(filteredPayload)
    .select(
      `
      *,
      appellation:appellation_id (
        id,
        region:region_id (
          id,
          country_id
        )
      ),
      region:region_id (
        id,
        country_id
      )
    `,
    )
    .single()

  if (error || !data) return { data: null, error }
  return { data: resolveHierarchy(data), error: null }
}

export async function updateWineDefinition(
  id: string,
  payload: UpdateWineDefinitionPayload,
): Promise<{ data: WineDefinitionRecord | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  const filteredPayload = keepMostSpecificOwner(payload)
  const { data, error } = await supabase
    .from('wine_definitions')
    .update(filteredPayload)
    .eq('id', id)
    .select(
      `
      *,
      appellation:appellation_id (
        id,
        region:region_id (
          id,
          country_id
        )
      ),
      region:region_id (
        id,
        country_id
      )
    `,
    )
    .single()

  if (error || !data) return { data: null, error }
  return { data: resolveHierarchy(data), error: null }
}

export async function deleteWineDefinition(id: string): Promise<{ error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('wine_definitions').delete().eq('id', id)
  return { error }
}

export async function validateWineDefinition(
  definition: any,
): Promise<{ data: any | null; error: PostgrestError | null }> {
  const supabase = getSupabaseClient()
  return supabase.rpc('validate_wine_definition', { definition })
}
