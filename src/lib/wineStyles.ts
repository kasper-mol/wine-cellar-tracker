import type { WineStyle } from '@/types/wineAppellations'

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
