import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { GrapeVarietyRecord } from '@/services/grapeVarieties'

export type GrapeRuleType = 'allowed' | 'required' | 'forbidden'

export interface GrapeAppellationRecord {
  id: string
  appellation_id: string
  grape_id: string
  rule: GrapeRuleType
  min_pct: number | null
  max_pct: number | null
  created_at: string
  updated_at: string
  grape?: GrapeVarietyRecord | null
}

export interface CreateGrapeAppellationPayload {
  appellation_id: string
  grape_id: string
  rule: GrapeRuleType
  min_pct?: number | null
  max_pct?: number | null
}

export interface UpdateGrapeAppellationPayload {
  rule?: GrapeRuleType
  min_pct?: number | null
  max_pct?: number | null
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

// Includes nested grape for convenience
const SELECT_COLUMNS = `
  id,
  appellation_id,
  grape_id,
  rule,
  min_pct,
  max_pct,
  created_at,
  updated_at,
  grape:grape_varieties(*)
`

// ─────────────────────────────────────────────────────────────
// Validation helpers (client-side, mirrors DB constraints)
// ─────────────────────────────────────────────────────────────
function validatePayload(
  rule: GrapeRuleType,
  minPct: number | null | undefined,
  maxPct: number | null | undefined,
) {
  // required must have min_pct
  if (rule === 'required' && (minPct === null || minPct === undefined)) {
    throw new Error('Required grapes must include a min_pct value')
  }

  // forbidden cannot have min/max
  if (
    rule === 'forbidden' &&
    ((minPct !== null && minPct !== undefined) || (maxPct !== null && maxPct !== undefined))
  ) {
    throw new Error('Forbidden grapes may not define percentage ranges')
  }

  // min <= max
  if (minPct !== null && minPct !== undefined && maxPct !== null && maxPct !== undefined) {
    if (minPct > maxPct) {
      throw new Error('min_pct cannot be greater than max_pct')
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Fetch by appellation
// ─────────────────────────────────────────────────────────────
export async function fetchGrapeAppellationsByAppellation(appellationId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('grape_appellations')
    .select(SELECT_COLUMNS)
    .eq('appellation_id', appellationId)
    .order('rule', { ascending: true })
    .order('grape_id', { ascending: true })

  throwIfError(error)
  return (data ?? []) as GrapeAppellationRecord[]
}

// ─────────────────────────────────────────────────────────────
// Fetch by grape (rare but useful)
// ─────────────────────────────────────────────────────────────
export async function fetchGrapeAppellationsByGrape(grapeId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('grape_appellations')
    .select(SELECT_COLUMNS)
    .eq('grape_id', grapeId)
    .order('appellation_id')

  throwIfError(error)
  return (data ?? []) as GrapeAppellationRecord[]
}

// ─────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────
export async function createGrapeAppellation(payload: CreateGrapeAppellationPayload) {
  validatePayload(payload.rule, payload.min_pct ?? null, payload.max_pct ?? null)

  const client = getSupabaseClient()
  const { data, error } = await client
    .from('grape_appellations')
    .insert({
      appellation_id: payload.appellation_id,
      grape_id: payload.grape_id,
      rule: payload.rule,
      min_pct: payload.min_pct ?? null,
      max_pct: payload.max_pct ?? null,
    })
    .select(SELECT_COLUMNS)
    .single()

  throwIfError(error)
  return data as GrapeAppellationRecord
}

// ─────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────
export async function updateGrapeAppellation(id: string, payload: UpdateGrapeAppellationPayload) {
  const client = getSupabaseClient()

  // Fetch current record to fill defaults
  const existing = await client
    .from('grape_appellations')
    .select('rule, min_pct, max_pct')
    .eq('id', id)
    .single()

  throwIfError(existing.error)

  const rule = payload.rule ?? existing.data.rule
  const min_pct = payload.min_pct !== undefined ? payload.min_pct : existing.data.min_pct
  const max_pct = payload.max_pct !== undefined ? payload.max_pct : existing.data.max_pct

  validatePayload(rule, min_pct, max_pct)

  const { data, error } = await client
    .from('grape_appellations')
    .update({
      rule,
      min_pct,
      max_pct,
    })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()

  throwIfError(error)
  return data as GrapeAppellationRecord
}

// ─────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────
export async function deleteGrapeAppellation(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('grape_appellations').delete().eq('id', id)

  throwIfError(error)
}
