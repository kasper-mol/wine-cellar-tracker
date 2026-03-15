import type { GrapeVarietyRecord } from '@/types/grapeVarieties'

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

export interface GrapeAppellationCreatePayload {
  appellation_id: string
  grape_id: string
  rule: GrapeRuleType
  min_pct?: number | null
  max_pct?: number | null
}

export interface GrapeAppellationUpdatePayload {
  rule?: GrapeRuleType
  min_pct?: number | null
  max_pct?: number | null
}
