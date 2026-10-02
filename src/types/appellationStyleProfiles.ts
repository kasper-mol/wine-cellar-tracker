import type { AppellationCopyStatus, WineStyle } from '@/types/wineAppellations'

/** Editorial text for ONE wine style of a multi-style appellation — a white and a red from the
 *  same appellation are different wines. Any null field falls back to the whole-appellation text. */
export interface AppellationStyleProfileRecord {
  id: string
  appellation_id: string
  wine_style: WineStyle
  style_summary: string | null
  drinking_window: string | null
  /** Picked from the appellation's own signature grapes (enforced by a DB trigger). */
  signature_grapes: string[] | null
  copy_status: AppellationCopyStatus
  created_at: string
  updated_at: string
}

export interface AppellationStyleProfileInput {
  appellation_id: string
  wine_style: WineStyle
  style_summary: string | null
  drinking_window: string | null
  signature_grapes: string[] | null
  copy_status: AppellationCopyStatus
}
