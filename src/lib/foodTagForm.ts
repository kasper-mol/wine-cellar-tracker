/** Pure helpers behind the food-tag admin form. */
import { normalizePhrase } from '@/lib/foodTagMatcher'
import type { FoodTagCategory, FoodTagCreatePayload, FoodTagRecord } from '@/types/foodPairings'

/** "Goat cheese & chèvre" → "goat-cheese-chevre": ASCII, lowercase, hyphenated. */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Comma- or newline-separated text → lowercase, trimmed, de-duplicated (order kept). */
export function parseSynonyms(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of text.split(/[\n,]/)) {
    const synonym = part.trim().toLowerCase()
    if (!synonym || seen.has(synonym)) continue
    seen.add(synonym)
    result.push(synonym)
  }
  return result
}

export function synonymsToText(synonyms: string[]): string {
  return synonyms.join(', ')
}

export interface SynonymConflict {
  phrase: string
  tag: FoodTagRecord
}

/** Phrases (the tag's name plus its synonyms) that another tag already claims. A shared
 *  phrase silently goes to whichever tag sorts first, so the editor should see it. */
export function findSynonymConflicts(
  tags: FoodTagRecord[],
  name: string,
  synonyms: string[],
  ignoreTagId: string | null = null,
): SynonymConflict[] {
  const owner = new Map<string, FoodTagRecord>()
  for (const tag of tags) {
    if (tag.id === ignoreTagId) continue
    for (const phrase of [tag.name, ...tag.synonyms]) {
      const key = normalizePhrase(phrase)
      if (key && !owner.has(key)) owner.set(key, tag)
    }
  }

  const conflicts: SynonymConflict[] = []
  const reported = new Set<string>()
  for (const phrase of [name, ...synonyms]) {
    const key = normalizePhrase(phrase)
    const tag = owner.get(key)
    if (!tag || reported.has(key)) continue
    reported.add(key)
    conflicts.push({ phrase, tag })
  }
  return conflicts
}

/** Form state: synonyms are edited as one block of text, everything else maps straight across. */
export interface FoodTagFormState {
  name: string
  slug: string
  category: FoodTagCategory
  synonyms: string
  sort_order: number
}

export function blankTagForm(sortOrder: number): FoodTagFormState {
  return { name: '', slug: '', category: 'protein', synonyms: '', sort_order: sortOrder }
}

export function tagToForm(tag: FoodTagRecord): FoodTagFormState {
  return {
    name: tag.name,
    slug: tag.slug,
    category: tag.category,
    synonyms: synonymsToText(tag.synonyms),
    sort_order: tag.sort_order,
  }
}

/** The tag's own name is always matched too, so it is seeded as a synonym when none is given. */
export function formToPayload(form: FoodTagFormState): FoodTagCreatePayload {
  const name = form.name.trim()
  const synonyms = parseSynonyms(form.synonyms)
  return {
    name,
    slug: form.slug.trim(),
    category: form.category,
    synonyms: synonyms.length ? synonyms : [name.toLowerCase()],
    sort_order: Number.isFinite(form.sort_order) ? Math.trunc(form.sort_order) : 0,
  }
}

/** One step past the current last tag, so a new tag sorts after the existing vocabulary. */
export function nextSortOrder(tags: FoodTagRecord[]): number {
  return tags.reduce((max, tag) => Math.max(max, tag.sort_order), 0) + 10
}
