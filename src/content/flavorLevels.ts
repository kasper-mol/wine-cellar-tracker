/** Glosses for the aroma-wheel levels. Keyed on the raw `level` string from
 * `flavor_descriptors`; null-safe by design. */
const GLOSS: Record<string, string> = {
  primary: 'from the grape and the fermentation',
  secondary: 'from winemaking',
  tertiary: 'from age',
}

export function levelGloss(level: string | null | undefined): string | null {
  if (!level) return null
  return GLOSS[level.trim().toLowerCase().replace(/_/g, ' ')] ?? null
}
