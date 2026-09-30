import { describe, expect, it } from 'vitest'
import { aggregateUnmatchedQueries } from '@/lib/foodSearchBacklog'
import {
  blankTagForm,
  findSynonymConflicts,
  formToPayload,
  nextSortOrder,
  parseSynonyms,
  slugify,
  synonymsToText,
  tagToForm,
} from '@/lib/foodTagForm'
import type { FoodSearchQueryRecord } from '@/types/foodPairings'
import { tag } from './fixtures'

describe('slugify', () => {
  it('produces an ASCII, hyphenated slug', () => {
    expect(slugify('Goat cheese')).toBe('goat-cheese')
    expect(slugify('Foie gras & pâté')).toBe('foie-gras-pate')
    expect(slugify('  Rosemary, thyme & woody herbs! ')).toBe('rosemary-thyme-woody-herbs')
    expect(slugify('Crème brûlée')).toBe('creme-brulee')
  })
})

describe('parseSynonyms', () => {
  it('splits on commas and newlines, lowercases, trims and de-duplicates', () => {
    expect(parseSynonyms('Salmon, Ocean Trout\nsteelhead ,  salmon,, ')).toEqual([
      'salmon',
      'ocean trout',
      'steelhead',
    ])
    expect(parseSynonyms('')).toEqual([])
  })

  it('round-trips through synonymsToText', () => {
    const synonyms = ['fish and chips', 'fish n chips']
    expect(parseSynonyms(synonymsToText(synonyms))).toEqual(synonyms)
  })
})

describe('findSynonymConflicts', () => {
  const vocab = [
    tag('salmon', ['salmon', 'ocean trout']),
    tag('goat-cheese', ["goat's cheese", 'chèvre']),
  ]

  it('reports phrases another tag already claims, compared in the matcher normal form', () => {
    const conflicts = findSynonymConflicts(vocab, 'Trout', ['Ocean  Trout', 'goat s cheese', 'lox'])
    expect(conflicts.map((c) => [c.phrase, c.tag.slug])).toEqual([
      ['Ocean  Trout', 'salmon'],
      ['goat s cheese', 'goat-cheese'],
    ])
  })

  it("ignores the tag being edited so it doesn't conflict with itself", () => {
    expect(findSynonymConflicts(vocab, 'Salmon', ['salmon', 'ocean trout'], 'tag-salmon')).toEqual(
      [],
    )
  })

  it("also checks the tag's own name", () => {
    const conflicts = findSynonymConflicts(vocab, 'Salmon', [])
    expect(conflicts.map((c) => c.tag.slug)).toEqual(['salmon'])
  })
})

describe('aggregateUnmatchedQueries', () => {
  const vocab = [tag('salmon'), tag('game', ['game', 'deer'])]
  const row = (id: string, raw: string, when: string, matched = 0): FoodSearchQueryRecord => ({
    id,
    raw_query: raw,
    matched_tag_ids: [],
    matched_count: matched,
    user_id: null,
    created_at: when,
  })

  it('folds case and whitespace variants together and counts them', () => {
    const result = aggregateUnmatchedQueries(
      [
        row('1', 'Tofu Scramble', '2026-09-01'),
        row('2', 'tofu   scramble', '2026-09-03'),
        row('3', 'kimchi jjigae', '2026-09-02'),
      ],
      vocab,
    )
    expect(result.map((r) => [r.query, r.count, r.lastSeen, r.ids])).toEqual([
      ['tofu scramble', 2, '2026-09-03', ['1', '2']],
      ['kimchi jjigae', 1, '2026-09-02', ['3']],
    ])
  })

  it('drops queries the current vocabulary now matches, without touching the rows', () => {
    const result = aggregateUnmatchedQueries(
      [row('1', 'deer', '2026-09-01'), row('2', 'tofu', '2026-09-01')],
      vocab,
    )
    expect(result.map((r) => r.query)).toEqual(['tofu']) // "deer" is a synonym of game now
  })

  it('ignores queries that matched something when they were logged', () => {
    expect(aggregateUnmatchedQueries([row('1', 'tofu', '2026-09-01', 2)], vocab)).toEqual([])
  })

  it('breaks count ties by recency', () => {
    const result = aggregateUnmatchedQueries(
      [row('1', 'older', '2026-09-01'), row('2', 'newer', '2026-09-05')],
      vocab,
    )
    expect(result.map((r) => r.query)).toEqual(['newer', 'older'])
  })
})

describe('tag form state', () => {
  it('round-trips a tag through the form', () => {
    const source = tag('salmon', ['salmon', 'ocean trout'], { sort_order: 30, category: 'seafood' })
    expect(formToPayload(tagToForm(source))).toEqual({
      name: 'salmon',
      slug: 'salmon',
      category: 'seafood',
      synonyms: ['salmon', 'ocean trout'],
      sort_order: 30,
    })
  })

  it('seeds the tag name as a synonym when none are given and trims the inputs', () => {
    const form = { ...blankTagForm(10), name: '  Tofu ', slug: ' tofu ', synonyms: '  ' }
    expect(formToPayload(form)).toMatchObject({ name: 'Tofu', slug: 'tofu', synonyms: ['tofu'] })
  })

  it('places a new tag after the existing vocabulary', () => {
    expect(nextSortOrder([])).toBe(10)
    expect(
      nextSortOrder([tag('a', ['a'], { sort_order: 740 }), tag('b', ['b'], { sort_order: 20 })]),
    ).toBe(750)
  })
})
