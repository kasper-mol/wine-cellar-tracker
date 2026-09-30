import { describe, expect, it } from 'vitest'
import { buildPhraseIndex, diceSimilarity, matchFoodTags } from '@/lib/foodTagMatcher'
import { tag } from './fixtures'

const slugs = (input: string, vocab: ReturnType<typeof tag>[]) =>
  matchFoodTags(input, vocab)
    .map((m) => m.tag.slug)
    .sort()

describe('matchFoodTags', () => {
  it('matches a multi-word synonym exactly, out of a longer sentence', () => {
    const vocab = [
      tag('fish-and-chips', ['fish and chips'], { category: 'cuisine' }),
      tag('white-fish', ['fish']),
      tag('potato', ['chips']),
    ]
    const result = matchFoodTags('having fish and chips tonight', vocab)

    // The 3-word window consumes all three words: no stray "fish"/"chips" matches.
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      matchedPhrase: 'fish and chips',
      confidence: 1,
    })
    expect(result[0]!.tag.slug).toBe('fish-and-chips')
  })

  it('never builds a phantom phrase across a stopword ("salmon … with a … lemon")', () => {
    const vocab = [
      tag('salmon'),
      tag('lemon'),
      tag('butter'),
      // A decoy that only exists if stopwords were stripped BEFORE phrase matching:
      // "salmon with a lemon" would collapse to "salmon lemon".
      tag('salmon-lemon', ['salmon lemon']),
      tag('butter-sauce', ['butter sauce']),
    ]
    const result = matchFoodTags('pan seared salmon with a lemon butter sauce', vocab)

    expect(result.map((m) => m.tag.slug).sort()).toEqual(['butter-sauce', 'lemon', 'salmon'])
    expect(result.find((m) => m.tag.slug === 'salmon-lemon')).toBeUndefined()
  })

  it('does not let an exact match suppress the fuzzy pass on a typo in the same query', () => {
    const vocab = [tag('spicy'), tag('grilled'), tag('chicken')]
    const result = matchFoodTags('spicy grillled chicken', vocab)

    expect(result.map((m) => m.tag.slug).sort()).toEqual(['chicken', 'grilled', 'spicy'])
    const grilled = result.find((m) => m.tag.slug === 'grilled')!
    expect(grilled.matchedPhrase).toBe('grillled') // matched fuzzily, as typed
    expect(result.find((m) => m.tag.slug === 'spicy')!.confidence).toBe(1)
    expect(result.find((m) => m.tag.slug === 'chicken')!.confidence).toBe(1)
  })

  it('resolves a fuzzy tie to the tag that sorts first in the pinned vocabulary order', () => {
    // "chickenz" is equally similar (and above the threshold) to both synonyms.
    const first = tag('first', ['chickenx'], { sort_order: 1 })
    const second = tag('second', ['chickeny'], { sort_order: 2 })

    const forward = matchFoodTags('chickenz', [first, second])
    const reversed = matchFoodTags('chickenz', [second, first])

    expect(diceSimilarity('chickenz', 'chickenx')).toBeGreaterThanOrEqual(0.72)
    expect(diceSimilarity('chickenz', 'chickenx')).toBe(diceSimilarity('chickenz', 'chickeny'))
    expect(forward).toHaveLength(1)
    expect(forward[0]!.tag.slug).toBe('first')
    expect(reversed[0]!.tag.slug).toBe('second') // same rule: first in the given order wins
  })

  it('is deterministic for the same vocabulary and input', () => {
    const vocab = [
      tag('salmon'),
      tag('grilled', ['grilled', 'grill']),
      tag('spicy', ['spicy', 'hot']),
    ]
    const a = matchFoodTags('spicy grilld salmons', vocab)
    const b = matchFoodTags('spicy grilld salmons', vocab)
    expect(b).toEqual(a)
    expect(a.map((m) => m.tag.slug).sort()).toEqual(['grilled', 'salmon', 'spicy'])
  })

  it('handles simple plurals and typos above the similarity threshold', () => {
    const vocab = [tag('salmon'), tag('grilled')]
    expect(slugs('salmons', vocab)).toEqual(['salmon'])
    expect(slugs('grilld', vocab)).toEqual(['grilled'])
  })

  it('ignores words below the threshold, short words and stopwords', () => {
    const vocab = [tag('salmon'), tag('tuna')]
    expect(matchFoodTags('pasta', vocab)).toEqual([])
    expect(matchFoodTags('an of in', vocab)).toEqual([])
    expect(matchFoodTags('', vocab)).toEqual([])
    expect(matchFoodTags('   ...  ', vocab)).toEqual([])
  })

  it('does not fuzzy-match everyday filler words onto a tag ("plate" vs "pate")', () => {
    const vocab = [tag('foie-gras-pate', ['pate', 'pâté'])]
    expect(matchFoodTags('a plate of pasta', vocab)).toEqual([])
    expect(slugs('pate', vocab)).toEqual(['foie-gras-pate'])
  })

  it('keeps the highest-confidence match when a tag matches twice', () => {
    const vocab = [tag('grilled', ['grilled', 'grill'])]
    const result = matchFoodTags('grill grilld', vocab)
    expect(result).toHaveLength(1)
    expect(result[0]!.confidence).toBe(1)
  })

  it('sorts matches by confidence, descending', () => {
    const vocab = [tag('salmon'), tag('lemon')]
    const result = matchFoodTags('salmons lemon', vocab)
    expect(result.map((m) => m.tag.slug)).toEqual(['lemon', 'salmon'])
  })

  it('treats punctuation as whitespace and lowercases', () => {
    const vocab = [tag('goat-cheese', ["goat's cheese", 'goat cheese'])]
    expect(slugs("Goat's Cheese, please!", vocab)).toEqual(['goat-cheese'])
  })

  it('reuses a prebuilt index and skips synonyms that normalise to nothing', () => {
    const vocab = [tag('salmon', ['salmon', '&']), tag('lemon')]
    const index = buildPhraseIndex(vocab)
    expect(index.every((entry) => entry.words.length > 0)).toBe(true)
    expect(matchFoodTags('salmon', vocab, index)).toHaveLength(1)
  })
})
