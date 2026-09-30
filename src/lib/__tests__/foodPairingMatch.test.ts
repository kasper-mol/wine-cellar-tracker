import { describe, expect, it } from 'vitest'
import { buildEditorialIndex } from '@/lib/foodPairingEditorial'
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

const editorialFor = (
  appellationId: string,
  mentions: [slug: string, phrase: string][],
): EditorialIndex =>
  new Map([[appellationId, mentions.map(([slug, phrase]) => ({ tagId: `tag-${slug}`, phrase }))]])

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
    tag('mushroom', ['mushroom', 'porcini']),
    tag('hard-cheese', ['gruyere', 'aged gruyere']),
  ]

  it("reads each appellation's classic pairings with the search matcher", () => {
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
      { tagId: 'tag-duck', phrase: 'roast duck breast' },
      { tagId: 'tag-mushroom', phrase: 'mushroom-stuffed beef tenderloin' },
      { tagId: 'tag-hard-cheese', phrase: 'aged Gruyere' },
    ])
    expect(index.has('bare')).toBe(false)
  })

  it('keeps the first phrase per tag and ignores fuzzy matches', () => {
    const index = buildEditorialIndex(
      [appellation('a', ['red'], { food_pairings: ['duck confit', 'duck breast', 'duk'] })],
      tags,
    )
    expect(index.get('a')).toEqual([{ tagId: 'tag-duck', phrase: 'duck confit' }])
  })
})
