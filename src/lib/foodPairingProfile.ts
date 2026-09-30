/** Appellation → food: the reverse of scoring. Pure; feeds the "Pairs well with" section. */
import type { FoodTagRecord, WineStyleFoodPairingRecord } from '@/types/foodPairings'
import type { AppellationFoodPairingRecord } from '@/types/foodPairings'
import type { WineStyle } from '@/types/wineAppellations'

export interface PairingProfileTag {
  tag: FoodTagRecord
  /** Baseline + override for this style. */
  affinity: number
  /** True when an editor curated this specifically for the appellation. */
  curated: boolean
}

export interface PairingProfileEntry {
  style: WineStyle
  tags: PairingProfileTag[]
}

/** Per style the appellation makes, the food tags that suit it best (combined affinity at or
 *  above `minAffinity`): editor-curated first, then strongest, then vocabulary order. A style
 *  with nothing that strong is left out. Styles keep the appellation's own order. */
export function buildPairingProfile(
  wineStyles: WineStyle[] | null,
  tags: FoodTagRecord[],
  baseline: WineStyleFoodPairingRecord[],
  overrides: AppellationFoodPairingRecord[],
  { minAffinity = 2, limit = 12 }: { minAffinity?: number; limit?: number } = {},
): PairingProfileEntry[] {
  const baselineByStyleTag = new Map(
    baseline.map((row) => [`${row.wine_style}:${row.food_tag_id}`, row.affinity]),
  )
  const overrideByStyleTag = new Map(
    overrides.map((row) => [`${row.wine_style}:${row.food_tag_id}`, row.affinity]),
  )

  const profile: PairingProfileEntry[] = []
  for (const style of wineStyles ?? []) {
    const entries: PairingProfileTag[] = []
    for (const tag of tags) {
      const key = `${style}:${tag.id}`
      const override = overrideByStyleTag.get(key)
      const affinity = (baselineByStyleTag.get(key) ?? 0) + (override ?? 0)
      if (affinity >= minAffinity) entries.push({ tag, affinity, curated: override !== undefined })
    }
    if (!entries.length) continue
    // Array.sort is stable, so equal entries keep the vocabulary's pinned order.
    entries.sort((a, b) => Number(b.curated) - Number(a.curated) || b.affinity - a.affinity)
    profile.push({ style, tags: entries.slice(0, limit) })
  }
  return profile
}
