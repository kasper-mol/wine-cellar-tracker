import type { WineStyle } from '@/types/wineAppellations'

/** One typical descriptor for one appellation in one style (Alsace white ≠ Alsace red). */
export interface AppellationFlavorRecord {
  id: string
  appellation_id: string
  descriptor_id: string
  wine_style: WineStyle
  created_at: string
}

export interface AppellationFlavorCreatePayload {
  appellation_id: string
  descriptor_id: string
  wine_style: WineStyle
}
