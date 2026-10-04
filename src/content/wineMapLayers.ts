import type { WineMapElementSize, WineMapOverlayKind } from '@/types/wineMaps'

export const WINE_MAP_OVERLAY_KINDS: readonly WineMapOverlayKind[] = ['water', 'places']

export const WINE_MAP_OVERLAY_LABELS: Record<WineMapOverlayKind, string> = {
  water: 'Water',
  places: 'Places',
}

/** Stacking order above the base map (base is 0). */
export const WINE_MAP_OVERLAY_DEFAULT_STACK: Record<WineMapOverlayKind, number> = {
  water: 10,
  places: 20,
}

/** Subtypes are validated here, not in the database, so adding one needs no migration. */
export const WINE_MAP_SUBTYPES: Record<WineMapOverlayKind, readonly string[]> = {
  water: ['river', 'lake', 'sea', 'canal', 'other'],
  places: ['city', 'town', 'village', 'mountain', 'landmark', 'other'],
}

export const WINE_MAP_SIZE_CLASSES: readonly WineMapElementSize[] = ['sm', 'md', 'lg']

/** Multiplier for a text's font size or a dot's radius. */
export const WINE_MAP_SIZE_SCALE: Record<WineMapElementSize, number> = {
  sm: 0.85,
  md: 1,
  lg: 1.2,
}

/** Largest dot-to-name distance auto-pairing accepts, as a share of the map's viewBox width. */
export const WINE_MAP_PAIRING_MAX_DISTANCE_RATIO = 0.04

export function isValidWineMapSubtype(kind: WineMapOverlayKind, value: string): boolean {
  return WINE_MAP_SUBTYPES[kind].includes(value)
}
