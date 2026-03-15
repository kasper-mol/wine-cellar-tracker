import type { WineRegionRecord } from '@/types/wineRegions'
import type { GrapeVarietyRecord } from '@/types/grapeVarieties'

export interface GrapeAppellationRuleRecord {
  id: string
  appellation_id: string
  grape_id: string
  rule: 'allowed' | 'required' | 'forbidden'
  min_pct: number | null
  max_pct: number | null
  created_at: string
  updated_at: string
  grape?: GrapeVarietyRecord | null
}

export interface WineAppellationRecord {
  id: string
  name: string
  region_id: string
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
  region?: WineRegionRecord | null
  grapes?: GrapeAppellationRuleRecord[] | null
}

export interface WineAppellationCreatePayload {
  name: string
  region_id: string
  description?: string | null
  imageFile?: File | null
}

export interface WineAppellationUpdatePayload {
  name?: string
  region_id?: string
  description?: string | null
  imageFile?: File | null
}
