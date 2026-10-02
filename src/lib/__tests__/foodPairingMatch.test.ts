import { describe, expect, it } from 'vitest'
import { attributeDishes, buildEditorialIndex } from '@/lib/foodPairingEditorial'
import type { EditorialIndex } from '@/lib/foodPairingEditorial'
import {
  compareAppellationResults,
  compareCellarMatches,
  computeMatch,
  scoreAppellations,
  scoreCellarWines,
} from '@/lib/foodPairingScorer'
import type { FoodTagMatch } from '@/lib/foodTagMatcher'
import { appellation, baseline, override, tag, wine } from './fixtures'

const match = (slug: string, confidence = 1): FoodTagMatch => ({
  tag: tag(slug),
  matchedPhrase: slug,
  confidence,
})

/** Classic dishes for one appellation; each dish reads as exactly one (anchor) tag. */
const editorialFor = (
  appellationId: string,
  dishes: [slug: string, phrase: string][],
): EditorialIndex =>
  new Map([
    [
      appellationId,
      dishes.map(([slug, phrase]) => ({
        phrase,
        tagIds: [`tag-${slug}`],
        anchorTagIds: [`tag-${slug}`],
      })),
    ],
  ])

describe('computeMatch', () => {
  it('maps a "good" rating to 6 and a "classic" one to 8 — the style-fit ceiling', () => {
    expect(computeMatch([{ affinity: 1, confidence: 1 }]).match).toBeCloseTo(6)
    expect(computeMatch([{ affinity: 2, confidence: 1 }]).match).toBeCloseTo(8)
  })

  it('averages over rated tags: classic game + good grilled = 7', () => {
    const { match: value, score } = computeMatch([
      { affinity: 2, confidence: 1 }, // game
      { affinity: 1, confidence: 1 }, // grilled
    ])
    expect(value).toBeCloseTo(7)
    expect(score).toBe(3)
  })

  it('adds appellation evidence up to +2, so 9 and 10 need the appellation itself', () => {
    const signals = [
      { affinity: 2, confidence: 1 },
      { affinity: 1, confidence: 1 },
    ]
    expect(computeMatch(signals, 1).match).toBeCloseTo(8)
    expect(computeMatch(signals, 2).match).toBeCloseTo(9)
    expect(computeMatch(signals, 9).match).toBeCloseTo(9) // capped at +2
    expect(computeMatch([{ affinity: 2, confidence: 1 }], 2).match).toBeCloseTo(10)
  })

  it('charges only a small penalty for a part of the dish the style does not rate', () => {
    // "grilled salmon": sparkling rates salmon +2 but is silent on grilled.
    const silent = computeMatch([
      { affinity: 2, confidence: 1 },
      { affinity: 0, confidence: 1 },
    ])
    expect(silent.match).toBeCloseTo(7) // 8 × 0.875 — not the 4 a proportional penalty would give
    // Ranking still follows real evidence: rated on both beats rated on one.
    const both = computeMatch([
      { affinity: 1, confidence: 1 },
      { affinity: 1, confidence: 1 },
    ])
    const one = computeMatch([
      { affinity: 1, confidence: 1 },
      { affinity: 0, confidence: 1 },
    ])
    expect(both.match).toBeGreaterThan(one.match)
  })

  it('scores a clash low and never lets evidence rescue it', () => {
    const clash = [
      { affinity: -1, confidence: 1 },
      { affinity: -1, confidence: 1 },
    ]
    expect(computeMatch(clash).match).toBeCloseTo(2)
    expect(computeMatch(clash, 2)).toEqual(computeMatch(clash))
    expect(computeMatch(clash).score).toBeLessThan(0)
  })

  it('is 0 when the style rates nothing, and weights by match confidence', () => {
    expect(computeMatch([{ affinity: 0, confidence: 1 }])).toEqual({ score: 0, match: 0 })
    expect(computeMatch([])).toEqual({ score: 0, match: 0 })
    // A single rated tag: confidence scales the raw sum but not the mean-based fit.
    expect(computeMatch([{ affinity: 2, confidence: 0.5 }])).toMatchObject({ score: 1 })
  })

  it('stays within 0…10', () => {
    const high = computeMatch([{ affinity: 4, confidence: 1 }], 99).match
    const low = computeMatch([{ affinity: -4, confidence: 1 }]).match
    expect(high).toBeLessThanOrEqual(10)
    expect(low).toBeGreaterThanOrEqual(0)
  })
})

describe('scoreAppellations: appellation evidence', () => {
  const dish = [match('game'), match('grilled')]
  const base = [baseline('red', 'game', 2), baseline('red', 'grilled', 1)]

  it('separates an appellation known for the dish from one that only shares the style', () => {
    const known = appellation('known', ['red'], { name: 'Known' })
    const generic = appellation('generic', ['red'], { name: 'Generic' })
    const results = scoreAppellations(
      [generic, known],
      dish,
      base,
      [],
      editorialFor('known', [
        ['game', 'venison with juniper'],
        ['grilled', 'grilled quail'],
      ]),
    )
    const byId = Object.fromEntries(results.map((r) => [r.appellation.id, r]))

    expect(byId.generic!.match).toBeCloseTo(7)
    expect(byId.known!.match).toBeCloseTo(9)
    expect(byId.known!.confirmedBy).toEqual(['venison with juniper', 'grilled quail'])
    expect(byId.generic!.confirmedBy).toEqual([])
    expect([...results].sort(compareAppellationResults).map((r) => r.appellation.id)).toEqual([
      'known',
      'generic',
    ])
  })

  it('does not let editorial confirm a style that has no rating for the ingredient', () => {
    const app = appellation('a', ['white'])
    const [result] = scoreAppellations(
      [app],
      [match('game')],
      [baseline('white', 'grilled', 1)], // white says nothing about game
      [],
      editorialFor('a', [['game', 'venison']]),
    )
    expect(result!.styleScores.white!.confirmedBy).toEqual([])
    expect(result!.match).toBe(0)
  })

  it('does not double-count editorial where an editor curated an override for that style', () => {
    const app = appellation('a', ['red'])
    const [result] = scoreAppellations(
      [app],
      [match('game')],
      [baseline('red', 'game', 1)],
      [override('a', 'red', 'game', 1)], // combined 2, curated +1 → half evidence
      editorialFor('a', [['game', 'venison']]),
    )
    expect(result!.match).toBeCloseTo(8 + 0.5)
    expect(result!.confirmedBy).toEqual([]) // the override, not the prose, is what confirmed it
  })

  it('counts a curated positive override as evidence even with no baseline rating', () => {
    const [result] = scoreAppellations(
      [appellation('a', ['white'])],
      [match('goat-cheese')],
      [],
      [override('a', 'white', 'goat-cheese', 2)],
    )
    expect(result!.match).toBeCloseTo(9) // fit 8 + a full-strength curation
  })

  it("applies evidence per style: a white editorial pairing doesn't lift the red", () => {
    const app = appellation('a', ['red', 'white'])
    const [result] = scoreAppellations(
      [app],
      [match('cheese')],
      [baseline('white', 'cheese', 2)],
      [],
      editorialFor('a', [['cheese', 'goat cheese']]),
    )
    expect(result!.styleScores.white!.match).toBeCloseTo(9)
    expect(result!.styleScores.red!.match).toBe(0)
  })

  it('drives by match, not raw sum, among styles that have something positive to say', () => {
    const app = appellation('a', ['red', 'white'])
    const three = [match('a'), match('b'), match('c')]
    const [result] = scoreAppellations(
      [app],
      three,
      [
        baseline('red', 'a', 1),
        baseline('red', 'b', 1),
        baseline('red', 'c', 1), // sum 3, mean 1 → 6.0
        baseline('white', 'a', 2), // sum 2, mean 2, one tag of three → 6.67
      ],
      [],
    )
    expect(result!.drivingStyle).toBe('white')
    expect(result!.score).toBe(2)
    expect(result!.match).toBeGreaterThan(result!.styleScores.red!.match)
  })
})

describe('scoreCellarWines: match and order', () => {
  const dish = [match('game'), match('grilled')]
  const base = [baseline('red', 'game', 2), baseline('red', 'grilled', 1)]
  const known = appellation('known', ['red'])
  const generic = appellation('generic', ['red'])
  const results = scoreAppellations(
    [known, generic],
    dish,
    base,
    [],
    editorialFor('known', [
      ['game', 'venison with juniper'],
      ['grilled', 'grilled quail'],
    ]),
  )

  it("gives a bottle its own style's match, including its appellation's evidence", () => {
    const cellar = scoreCellarWines(
      [wine('generic-bottle', 'red', 'generic'), wine('known-bottle', 'red', 'known')],
      dish,
      results,
      base,
    )
    expect(cellar.map((m) => [m.wine.id, Math.round(m.match)])).toEqual([
      ['known-bottle', 9],
      ['generic-bottle', 7],
    ])
    expect(cellar[0]!.confirmedBy).toEqual(['venison with juniper', 'grilled quail'])
  })

  it('scores a bottle with no appellation from the style baseline alone', () => {
    const cellar = scoreCellarWines([wine('plain', 'red', null)], dish, results, base)
    expect(cellar[0]!.match).toBeCloseTo(7)
    expect(cellar[0]!.confirmedBy).toEqual([])
  })

  it('breaks ties by the rating you gave, unrated last, then by name', () => {
    const rated = (id: string, name: string, rating: number | null) => ({
      ...wine(id, 'red', 'generic'),
      name,
      rating,
    })
    const cellar = scoreCellarWines(
      [
        rated('u', 'Zeta', null),
        rated('b', 'Beta', 90),
        rated('a', 'Alpha', 90),
        rated('c', 'Gamma', 95),
      ],
      dish,
      results,
      base,
    )
    expect(cellar.map((m) => m.wine.name)).toEqual(['Gamma', 'Alpha', 'Beta', 'Zeta'])
  })

  it('compareCellarMatches ranks by match before anything else', () => {
    const strong = {
      wine: wine('s', 'red', null),
      score: 3,
      match: 9,
      drivingStyle: 'red' as const,
      positiveTagIds: [],
      confirmedBy: [],
    }
    const weak = { ...strong, wine: { ...wine('w', 'red', null), rating: 100 }, score: 5, match: 6 }
    expect(compareCellarMatches(strong, weak)).toBeLessThan(0)
  })
})

describe('buildEditorialIndex', () => {
  const tags = [
    tag('duck'),
    tag('mushroom', ['mushroom', 'porcini'], { category: 'vegetable_produce' }),
    tag('hard-cheese', ['gruyere', 'aged gruyere'], { category: 'cheese_dairy' }),
    tag('roasted', ['roast', 'roasted'], { category: 'preparation' }),
  ]

  it("reads each appellation's classic dishes with the search matcher, one entry per dish", () => {
    const index = buildEditorialIndex(
      [
        appellation('margaux', ['red'], {
          food_pairings: ['roast duck breast', 'mushroom-stuffed beef tenderloin', 'aged Gruyere'],
        }),
        appellation('bare', ['red'], { food_pairings: null }),
      ],
      tags,
    )
    expect(index.get('margaux')).toEqual([
      // "roast" is a modifier: the dish is a duck dish, and duck is its only anchor.
      {
        phrase: 'roast duck breast',
        tagIds: ['tag-duck', 'tag-roasted'],
        anchorTagIds: ['tag-duck'],
      },
      {
        phrase: 'mushroom-stuffed beef tenderloin',
        tagIds: ['tag-mushroom'],
        anchorTagIds: ['tag-mushroom'], // no main ingredient in the vocabulary: secondary anchor
      },
      { phrase: 'aged Gruyere', tagIds: ['tag-hard-cheese'], anchorTagIds: ['tag-hard-cheese'] },
    ])
    expect(index.has('bare')).toBe(false)
  })

  it('keeps a dish it cannot read (no tags) and ignores fuzzy matches', () => {
    const index = buildEditorialIndex([appellation('a', ['red'], { food_pairings: ['duk'] })], tags)
    expect(index.get('a')).toEqual([{ phrase: 'duk', tagIds: [], anchorTagIds: [] }])
  })
})

describe('attributeDishes: a white and a red from one appellation are different wines', () => {
  const tags = [
    tag('game'),
    tag('pork'),
    tag('white-fish', ['river fish'], { category: 'seafood' }),
    tag('grilled', ['grilled'], { category: 'preparation' }),
  ]
  const rates: Record<string, number> = {
    'red:tag-game': 2,
    'red:tag-pork': 1,
    'red:tag-grilled': 1,
    'white:tag-white-fish': 2,
    'white:tag-pork': 1,
    'rose:tag-pork': 1,
  }
  const affinity = (style: string, tagId: string) => rates[`${style}:${tagId}`] ?? 0

  const macon = appellation('macon', ['white', 'red', 'rose'], {
    food_pairings: ['grilled river fish', 'pork rillettes', 'rabbit stew', 'choucroute'],
  })
  // Rabbit isn't a vocabulary word here; give the stew a game synonym via the tag list.
  const vocab = [
    ...tags.slice(0, 1).map((t) => ({ ...t, synonyms: ['game', 'rabbit'] })),
    ...tags.slice(1),
  ]
  const dishes = buildEditorialIndex([macon], vocab).get('macon')!

  it('gives each style the dishes whose main ingredient it rates', () => {
    const { byStyle, unattributed } = attributeDishes(dishes, ['white', 'red', 'rose'], affinity)
    const phrases = (style: 'white' | 'red' | 'rose') => byStyle.get(style)!.map((d) => d.phrase)

    expect(phrases('white')).toEqual(['grilled river fish', 'pork rillettes'])
    expect(phrases('red')).toEqual(['pork rillettes', 'rabbit stew']) // not the white's fish
    expect(phrases('rose')).toEqual(['pork rillettes'])
    expect(unattributed.map((d) => d.phrase)).toEqual(['choucroute']) // unreadable: no tags
  })

  it('leaves a dish nobody rates unattributed, and hands a lone style every readable dish', () => {
    const lone = attributeDishes(dishes, ['red'], affinity)
    expect(lone.byStyle.get('red')!.map((d) => d.phrase)).toEqual([
      'grilled river fish',
      'pork rillettes',
      'rabbit stew',
    ])
    expect(lone.unattributed.map((d) => d.phrase)).toEqual(['choucroute'])

    const nobody = attributeDishes(dishes, ['sparkling', 'sweet'], () => 0)
    expect(nobody.byStyle.get('sparkling')).toEqual([])
    expect(nobody.unattributed).toHaveLength(4)
  })

  it('does not guess a style for a dish that names no main ingredient (only a cooking method)', () => {
    const stew = [{ phrase: 'baeckeoffe stew', tagIds: ['tag-grilled'], anchorTagIds: [] }]
    // Red rates the cooking method, but that alone doesn't make it a red-wine dish.
    const many = attributeDishes(stew, ['white', 'red'], affinity)
    expect(many.byStyle.get('red')).toEqual([])
    expect(many.unattributed.map((d) => d.phrase)).toEqual(['baeckeoffe stew'])
    // With one style there is nothing to guess: it owns the dish.
    expect(attributeDishes(stew, ['red'], affinity).byStyle.get('red')).toHaveLength(1)
  })

  it('counts a curated override as the style rating the ingredient', () => {
    const withOverride = (style: string, tagId: string) =>
      affinity(style, tagId) + (style === 'red' && tagId === 'tag-white-fish' ? 1 : 0)
    const { byStyle } = attributeDishes(dishes, ['white', 'red', 'rose'], withOverride)
    expect(byStyle.get('red')!.map((d) => d.phrase)).toContain('grilled river fish')
  })
})

describe('scoreAppellations: a dish only counts for the style it belongs to', () => {
  // "Grilled game". Red rates game +2 and grilled +1; the white rates neither.
  const dish: FoodTagMatch[] = [
    match('game'),
    {
      tag: tag('grilled', ['grilled'], { category: 'preparation' }),
      matchedPhrase: 'grilled',
      confidence: 1,
    },
  ]
  const base = [
    baseline('red', 'game', 2),
    baseline('red', 'grilled', 1),
    baseline('white', 'white-fish', 2),
  ]
  const macon = appellation('macon', ['white', 'red'], { name: 'Mâcon' })
  const dishes: EditorialIndex = new Map([
    [
      'macon',
      [
        {
          phrase: 'grilled river fish',
          tagIds: ['tag-grilled', 'tag-white-fish'],
          anchorTagIds: ['tag-white-fish'],
        },
        { phrase: 'rabbit stew', tagIds: ['tag-game'], anchorTagIds: ['tag-game'] },
      ],
    ],
  ])

  it("does not let the white's fish dish lift the red's 'grilled'", () => {
    const [result] = scoreAppellations([macon], dish, base, [], dishes)
    const red = result!.styleScores.red!

    expect(red.confirmedBy).toEqual(['rabbit stew']) // the fish dish is the white's, not the red's
    expect(red.match).toBeCloseTo(7 + 1) // fit 7 + one confirmed ingredient — was 9 when the dish counted
  })

  it('still gives the red its own dish, and a single-style appellation every dish it can read', () => {
    const single = appellation('single', ['red'], { name: 'Single' })
    const both: EditorialIndex = new Map([['single', dishes.get('macon')!]])
    const [result] = scoreAppellations([single], dish, base, [], both)
    expect(result!.match).toBeCloseTo(9) // nothing to tell apart: both dishes confirm
  })
})
