import type { WineStyle } from '@/types/wineAppellations'
import type { WineStyle as WineRecordStyle } from '@/types/wines'

/** The one place lowercase style tokens become display labels. */
const STYLE_LABELS: Record<WineStyle, string> = {
  red: 'Red',
  white: 'White',
  rose: 'Rosé',
  orange: 'Orange',
  sparkling: 'Sparkling',
  sweet: 'Sweet',
  fortified: 'Fortified',
}

/** Falls back to the raw token so an unmapped value still reads as itself. */
export function wineStyleLabel(style: string): string {
  return STYLE_LABELS[style as WineStyle] ?? style
}

/** wines.style is a narrower, differently spelled union than the appellation styles
 *  (`rosé`/`dessert` vs `rose`/`sweet`; no orange/fortified). This is the one place
 *  the two are reconciled. Takes the non-nullable style: callers rule out `null` first,
 *  so an unset style is never silently read as a colour. */
const TO_APPELLATION_STYLE: Record<WineRecordStyle, WineStyle> = {
  red: 'red',
  white: 'white',
  rosé: 'rose',
  sparkling: 'sparkling',
  dessert: 'sweet',
}

export function toAppellationStyle(style: WineRecordStyle): WineStyle {
  return TO_APPELLATION_STYLE[style]
}
