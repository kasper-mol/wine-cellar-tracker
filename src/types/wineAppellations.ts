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

/** Editorial copy is written in batches; rows sit at `pending` until a batch lands. */
export type AppellationCopyStatus = 'pending' | 'generated' | 'reviewed'

/** Lowercase tokens as stored — a DB CHECK constrains the column to this set. */
export type WineStyle = 'red' | 'white' | 'rose' | 'orange' | 'sparkling' | 'sweet' | 'fortified'

export interface WineAppellationRecord {
  id: string
  name: string
  region_id: string
  description: string | null
  image_url: string | null
  established_year: number | null
  created_at: string
  updated_at: string
  /** Editorial copy. Every field is filled batch by batch and degrades on its own. */
  short_description: string | null
  pronunciation: string | null
  classification: string | null
  signature_grapes: string[] | null
  wine_styles: WineStyle[] | null
  style_summary: string | null
  climate_soil: string | null
  food_pairings: string[] | null
  /** Display string — never parsed or sorted on. */
  drinking_window: string | null
  fun_fact: string | null
  copy_status: AppellationCopyStatus
  copy_updated_at: string | null
  region?: WineRegionRecord | null
  grapes?: GrapeAppellationRuleRecord[] | null
}

/** The editorial columns, writable from the manage dialogs. Omit a key to leave it untouched. */
export interface WineAppellationCopyInput {
  short_description?: string | null
  description?: string | null
  pronunciation?: string | null
  classification?: string | null
  established_year?: number | null
  signature_grapes?: string[] | null
  wine_styles?: WineStyle[] | null
  style_summary?: string | null
  climate_soil?: string | null
  food_pairings?: string[] | null
  drinking_window?: string | null
  fun_fact?: string | null
  copy_status?: AppellationCopyStatus
}

export interface WineAppellationCreatePayload extends WineAppellationCopyInput {
  name: string
  region_id: string
  imageFile?: File | null
}

export interface WineAppellationUpdatePayload extends WineAppellationCopyInput {
  name?: string
  region_id?: string
  imageFile?: File | null
}
