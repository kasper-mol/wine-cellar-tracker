/** Free text → food tags. Pure and synchronous: no Supabase, no network, no LLM. */
import type { FoodTagRecord } from '@/types/foodPairings'

export interface FoodTagMatch {
  tag: FoodTagRecord
  matchedPhrase: string
  /** 1 = exact phrase (or a direct selection), otherwise the fuzzy similarity. */
  confidence: number
}

export interface PhraseEntry {
  words: string[]
  tag: FoodTagRecord
}

/** Only ever consulted per single leftover word (step 3) — never before phrase matching. */
const STOPWORDS = new Set([
  'with',
  'and',
  'the',
  'a',
  'an',
  'of',
  'in',
  'on',
  'for',
  'some',
  'my',
  'our',
  'im',
  "i'm",
  'eating',
  'having',
  'tonight',
  'dinner',
  // "plate" fuzzy-matches the "pate" synonym (0.73); a plate of pasta is not pâté.
  'plate',
])

const FUZZY_THRESHOLD = 0.72

function normalize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

/** A phrase in the matcher's own normal form — what conflict checks must compare. */
export function normalizePhrase(phrase: string): string {
  return normalize(phrase).join(' ')
}

function bigrams(word: string): Set<string> {
  const padded = `_${word}_`
  const set = new Set<string>()
  for (let i = 0; i < padded.length - 1; i++) set.add(padded.slice(i, i + 2))
  return set
}

export function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const A = bigrams(a)
  const B = bigrams(b)
  let overlap = 0
  for (const g of A) if (B.has(g)) overlap++
  return (2 * overlap) / (A.size + B.size)
}

/** Build once per vocabulary load (memoize on the `tags` array reference in the store).
 *  `tags` must already be in a stable, pinned order (see fetchFoodTags's ORDER BY) —
 *  this relies on Array.sort being stable (ES2019) so equal-length entries keep that order.
 *  Phrase length is whatever each tag's name/synonym actually is; there is no cap. */
export function buildPhraseIndex(tags: FoodTagRecord[]): PhraseEntry[] {
  const entries: PhraseEntry[] = []
  for (const tag of tags) {
    for (const phrase of [tag.name, ...tag.synonyms]) {
      const words = normalize(phrase)
      if (words.length) entries.push({ words, tag })
    }
  }
  return entries.sort((a, b) => b.words.length - a.words.length)
}

export function matchFoodTags(
  input: string,
  tags: FoodTagRecord[],
  index?: PhraseEntry[],
): FoodTagMatch[] {
  const phraseIndex = index ?? buildPhraseIndex(tags)
  // Full, unfiltered tokenization: phrase matching below only sees words that are
  // truly adjacent in what the user typed — a removed stopword can never make two
  // distant words look like a phrase.
  const words = normalize(input)
  const consumed: boolean[] = new Array(words.length).fill(false)
  const matches = new Map<string, FoodTagMatch>()

  // Step 2: phrase matching, longest window first. Runs to completion — no early return.
  const maxLen = phraseIndex[0]?.words.length ?? 1
  for (let len = maxLen; len >= 1; len--) {
    for (const entry of phraseIndex) {
      if (entry.words.length !== len) continue
      for (let start = 0; start <= words.length - len; start++) {
        if (consumed.slice(start, start + len).some(Boolean)) continue
        let hit = true
        for (let i = 0; i < len; i++) {
          if (words[start + i] !== entry.words[i]) {
            hit = false
            break
          }
        }
        if (!hit) continue
        for (let i = 0; i < len; i++) consumed[start + i] = true
        const existing = matches.get(entry.tag.id)
        if (!existing || existing.confidence < 1) {
          matches.set(entry.tag.id, {
            tag: entry.tag,
            matchedPhrase: entry.words.join(' '),
            confidence: 1,
          })
        }
      }
    }
  }

  // Step 3: fuzzy fallback. Judges every word purely on its own `consumed[i]` flag —
  // never gated by whether step 2 already matched something else in the same query.
  const singleWordEntries: { entry: PhraseEntry; synonym: string }[] = []
  for (const entry of phraseIndex) {
    const [synonym] = entry.words
    if (entry.words.length === 1 && synonym) singleWordEntries.push({ entry, synonym })
  }
  words.forEach((word, i) => {
    if (consumed[i] || word.length < 3 || STOPWORDS.has(word)) return
    let best: { entry: PhraseEntry; score: number } | null = null
    for (const { entry, synonym } of singleWordEntries) {
      const score = diceSimilarity(word, synonym)
      // Strict `>`: with the pinned, stable vocabulary order a tie always resolves
      // to the tag that sorts first by (sort_order, id).
      if (score >= FUZZY_THRESHOLD && (!best || score > best.score)) best = { entry, score }
    }
    if (best) {
      const existing = matches.get(best.entry.tag.id)
      if (!existing || existing.confidence < best.score) {
        matches.set(best.entry.tag.id, {
          tag: best.entry.tag,
          matchedPhrase: word,
          confidence: best.score,
        })
      }
    }
  })

  return [...matches.values()].sort((a, b) => b.confidence - a.confidence)
}
