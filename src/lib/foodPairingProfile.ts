/** Appellation → food: the reverse of scoring. Pure; feeds the "Pairs well with" section. */
import { attributeDishes } from '@/lib/foodPairingEditorial'
import type { EditorialDish } from '@/lib/foodPairingEditorial'
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

export interface AppellationPairingStyle {
  style: WineStyle
  /** The appellation's classic dishes that belong to this style (multi-style appellations only). */
  dishes: string[]
  /** Food tags this style suits, from the baseline plus any curated overrides. */
  tags: PairingProfileTag[]
}

export interface AppellationPairings {
  styles: AppellationPairingStyle[]
  /** Classic dishes no single style owns — unreadable, or without a main ingredient. */
  unattributed: string[]
}

/** Everything the appellation page says about food, kept apart per wine style: a white
 *  Châteauneuf-du-Pape and a red one are different wines with different dishes. Dishes are
 *  only split when the appellation makes more than one style; with a single style the flat
 *  "classic pairings" prose already says it all and nothing is repeated here. */
export function buildAppellationPairings(
  wineStyles: WineStyle[] | null,
  tags: FoodTagRecord[],
  baseline: WineStyleFoodPairingRecord[],
  overrides: AppellationFoodPairingRecord[],
  dishes: EditorialDish[],
  options: { minAffinity?: number; limit?: number } = {},
): AppellationPairings {
  const styleList = wineStyles ?? []
  const chipsByStyle = new Map(
    buildPairingProfile(styleList, tags, baseline, overrides, options).map((entry) => [
      entry.style,
      entry.tags,
    ]),
  )

  const multiStyle = styleList.length > 1
  const ratingOf = new Map<string, number>()
  for (const row of baseline) {
    ratingOf.set(`${row.wine_style}:${row.food_tag_id}`, row.affinity)
  }
  for (const row of overrides) {
    const key = `${row.wine_style}:${row.food_tag_id}`
    ratingOf.set(key, (ratingOf.get(key) ?? 0) + row.affinity)
  }
  const attribution = multiStyle
    ? attributeDishes(dishes, styleList, (style, tagId) => ratingOf.get(`${style}:${tagId}`) ?? 0)
    : null

  const styles: AppellationPairingStyle[] = []
  for (const style of styleList) {
    const styleTags = chipsByStyle.get(style) ?? []
    const styleDishes = (attribution?.byStyle.get(style) ?? []).map((dish) => dish.phrase)
    if (styleTags.length || styleDishes.length) {
      styles.push({ style, dishes: styleDishes, tags: styleTags })
    }
  }
  return { styles, unattributed: (attribution?.unattributed ?? []).map((dish) => dish.phrase) }
}
