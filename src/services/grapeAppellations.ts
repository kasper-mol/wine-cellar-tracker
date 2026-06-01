import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  GrapeAppellationCreatePayload,
  GrapeAppellationRecord,
  GrapeRuleType,
  GrapeAppellationUpdatePayload,
} from '@/types/grapeAppellations'

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

function validatePayload(
  rule: GrapeRuleType,
  minPct: number | null | undefined,
  maxPct: number | null | undefined,
) {
  if (rule === 'required' && (minPct === null || minPct === undefined)) {
    throw new Error('Required grapes must include a min_pct value')
  }
  if (
    rule === 'forbidden' &&
    ((minPct !== null && minPct !== undefined) || (maxPct !== null && maxPct !== undefined))
  ) {
    throw new Error('Forbidden grapes may not define percentage ranges')
  }
  if (minPct != null && maxPct != null && minPct > maxPct) {
    throw new Error('min_pct cannot be greater than max_pct')
  }
}

export async function fetchGrapeAppellationsByAppellation(appellationId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('grape_appellations')
    .select(SELECT_COLUMNS)
    .eq('appellation_id', appellationId)
    .order('rule', { ascending: true })
    .order('grape_id', { ascending: true })
  throwIfError(error)
  return (data ?? []) as unknown as GrapeAppellationRecord[]
}

export async function fetchGrapeAppellationsByGrape(grapeId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('grape_appellations')
    .select(SELECT_COLUMNS)
    .eq('grape_id', grapeId)
    .order('appellation_id')
  throwIfError(error)
  return (data ?? []) as unknown as GrapeAppellationRecord[]
}

export async function createGrapeAppellation(payload: GrapeAppellationCreatePayload) {
  validatePayload(payload.rule, payload.min_pct ?? null, payload.max_pct ?? null)

  const db = getSupabaseClient()
  const { data, error } = await db
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
  if (!data) throw new Error('Failed to create grape appellation')
  return data as unknown as GrapeAppellationRecord
}

export async function updateGrapeAppellation(id: string, payload: GrapeAppellationUpdatePayload) {
  const db = getSupabaseClient()

  const { data: existing, error: fetchError } = await db
    .from('grape_appellations')
    .select('rule, min_pct, max_pct')
    .eq('id', id)
    .single()
  throwIfError(fetchError)
  if (!existing) throw new Error('Grape appellation not found')

  const rule = payload.rule ?? existing.rule
  const min_pct = payload.min_pct !== undefined ? payload.min_pct : existing.min_pct
  const max_pct = payload.max_pct !== undefined ? payload.max_pct : existing.max_pct
  validatePayload(rule, min_pct, max_pct)

  const { data, error } = await db
    .from('grape_appellations')
    .update({ rule, min_pct, max_pct })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single()
  throwIfError(error)
  if (!data) throw new Error('Failed to update grape appellation')
  return data as unknown as GrapeAppellationRecord
}

export async function deleteGrapeAppellation(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('grape_appellations').delete().eq('id', id)
  throwIfError(error)
}
