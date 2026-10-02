/** Reads each appellation's hand-written "classic pairings" with the same matcher the search
 *  uses, and works out which of the appellation's wine styles each dish belongs to.
 *
 *  The prose is one flat list with no style on it, but a white and a red from the same
 *  appellation are different wines: a rabbit stew is the red's dish, grilled river fish the
 *  white's. A dish belongs to a style when that style rates the dish's main ingredient well.
 *  Runtime signal only — nothing is stored or written back. */
import { MAIN_INGREDIENT_CATEGORIES, SECONDARY_ANCHOR_CATEGORIES } from '@/lib/foodTagCategories'
import { matchFoodTags } from '@/lib/foodTagMatcher'
import type { PhraseEntry } from '@/lib/foodTagMatcher'
import type { FoodTagRecord } from '@/types/foodPairings'
import type { WineAppellationRecord, WineStyle } from '@/types/wineAppellations'

export interface EditorialDish {
  /** The editorial phrase as written, e.g. "venison with juniper". */
  phrase: string
  /** Every food tag the phrase reads as (exact matches only). Empty when it reads as none. */
  tagIds: string[]
  /** The tags that say what the dish IS — its main ingredients, else its secondary anchors.
   *  Empty when the dish is only modifiers ("grilled"). Ownership by style hangs on these. */
  anchorTagIds: string[]
}

/** Appellation id → its classic dishes, in the order they are written. */
export type EditorialIndex = Map<string, EditorialDish[]>

/** How a style rates a tag (baseline plus any curated override): −2…+2, 0 when unrated. */
export type AffinityLookup = (style: WineStyle, tagId: string) => number

function anchorsOf(tagIds: string[], categoryById: Map<string, FoodTagRecord['category']>) {
  const inCategories = (categories: readonly string[]) =>
    tagIds.filter((id) => categories.includes(categoryById.get(id) ?? ''))
  const main = inCategories(MAIN_INGREDIENT_CATEGORIES)
  return main.length ? main : inCategories(SECONDARY_ANCHOR_CATEGORIES)
}

/** Only exact phrase matches count: editorial copy is clean, so a fuzzy hit on it would be noise. */
export function buildEditorialIndex(
  appellations: WineAppellationRecord[],
  tags: FoodTagRecord[],
  index?: PhraseEntry[],
): EditorialIndex {
  const categoryById = new Map(tags.map((tag) => [tag.id, tag.category]))
  const result: EditorialIndex = new Map()
  for (const appellation of appellations) {
    const dishes: EditorialDish[] = (appellation.food_pairings ?? []).map((phrase) => {
      const tagIds = matchFoodTags(phrase, tags, index)
        .filter((match) => match.confidence === 1)
        .map((match) => match.tag.id)
      return { phrase, tagIds, anchorTagIds: anchorsOf(tagIds, categoryById) }
    })
    if (dishes.length) result.set(appellation.id, dishes)
  }
  return result
}

/** Whether `style` owns `dish`: it rates the dish's main ingredient (any anchor) positively.
 *  A dish with no anchor ("baeckeoffe stew" reads only as *braised*) says nothing about which
 *  wine it is for, so it is not guessed at from a cooking method or a flavour. An appellation
 *  with a single style owns every dish it can read — there is nothing to tell apart. */
function ownsDish(
  dish: EditorialDish,
  style: WineStyle,
  styleCount: number,
  affinity: AffinityLookup,
): boolean {
  if (dish.tagIds.length === 0) return false
  if (styleCount <= 1) return true
  return dish.anchorTagIds.some((tagId) => affinity(style, tagId) >= 1)
}

export interface DishAttribution {
  /** Dishes each style owns; one dish can belong to several styles (pork suits red and white). */
  byStyle: Map<WineStyle, EditorialDish[]>
  /** Dishes no style owns: unreadable, only modifiers, or about food none of the styles rate. */
  unattributed: EditorialDish[]
}

export function attributeDishes(
  dishes: EditorialDish[],
  styles: WineStyle[],
  affinity: AffinityLookup,
): DishAttribution {
  const byStyle = new Map<WineStyle, EditorialDish[]>(styles.map((style) => [style, []]))
  const unattributed: EditorialDish[] = []
  for (const dish of dishes) {
    let owned = false
    for (const style of styles) {
      if (!ownsDish(dish, style, styles.length, affinity)) continue
      byStyle.get(style)!.push(dish)
      owned = true
    }
    if (!owned) unattributed.push(dish)
  }
  return { byStyle, unattributed }
}
