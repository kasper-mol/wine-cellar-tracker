/** Reads each appellation's hand-written "classic pairings" with the same matcher the search
 *  uses, so an appellation known for "venison with juniper" can be told apart from one that only
 *  shares its wine style. Runtime signal only — nothing is stored or written back. */
import { matchFoodTags } from '@/lib/foodTagMatcher'
import type { PhraseEntry } from '@/lib/foodTagMatcher'
import type { FoodTagRecord } from '@/types/foodPairings'
import type { WineAppellationRecord } from '@/types/wineAppellations'

export interface EditorialMention {
  tagId: string
  /** The editorial phrase that names it, e.g. "venison with juniper". */
  phrase: string
}

/** Appellation id → the food tags its classic pairings mention. */
export type EditorialIndex = Map<string, EditorialMention[]>

/** Only exact phrase matches count: editorial copy is clean, so a fuzzy hit on it would be noise. */
export function buildEditorialIndex(
  appellations: WineAppellationRecord[],
  tags: FoodTagRecord[],
  index?: PhraseEntry[],
): EditorialIndex {
  const result: EditorialIndex = new Map()
  for (const appellation of appellations) {
    const mentions = new Map<string, EditorialMention>()
    for (const phrase of appellation.food_pairings ?? []) {
      for (const match of matchFoodTags(phrase, tags, index)) {
        if (match.confidence === 1 && !mentions.has(match.tag.id)) {
          mentions.set(match.tag.id, { tagId: match.tag.id, phrase })
        }
      }
    }
    if (mentions.size) result.set(appellation.id, [...mentions.values()])
  }
  return result
}
