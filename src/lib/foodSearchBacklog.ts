/** Turns the raw search log into the admin's "what did people type that we can't match?" list. */
import { matchFoodTags } from '@/lib/foodTagMatcher'
import type { PhraseEntry } from '@/lib/foodTagMatcher'
import type { FoodSearchQueryRecord, FoodTagRecord } from '@/types/foodPairings'

export interface UnmatchedQuery {
  /** The query as first seen, lowercased and whitespace-collapsed. */
  query: string
  count: number
  lastSeen: string
  /** Every log row folded into this entry — what "dismiss" deletes. */
  ids: string[]
}

/** Groups zero-match queries case-insensitively and keeps only those the CURRENT vocabulary
 *  still can't match: adding a synonym makes an entry vanish without deleting any log data.
 *  Most-asked first, then most recent. */
export function aggregateUnmatchedQueries(
  rows: FoodSearchQueryRecord[],
  tags: FoodTagRecord[],
  index?: PhraseEntry[],
): UnmatchedQuery[] {
  const groups = new Map<string, UnmatchedQuery>()
  for (const row of rows) {
    if (row.matched_count !== 0) continue
    const query = row.raw_query.toLowerCase().replace(/\s+/g, ' ').trim()
    if (!query) continue
    const group = groups.get(query)
    if (group) {
      group.count++
      group.ids.push(row.id)
      if (row.created_at > group.lastSeen) group.lastSeen = row.created_at
    } else {
      groups.set(query, { query, count: 1, lastSeen: row.created_at, ids: [row.id] })
    }
  }

  return [...groups.values()]
    .filter((group) => matchFoodTags(group.query, tags, index).length === 0)
    .sort((a, b) => b.count - a.count || (a.lastSeen < b.lastSeen ? 1 : -1))
}
