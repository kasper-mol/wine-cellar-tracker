import { describe, expect, it } from 'vitest'
import type { FoodTagMatch } from '@/lib/foodTagMatcher'
import type { FoodTagCategory } from '@/types/foodPairings'
import {
  compareAppellationResults,
  groupByDrivingTags,
  scoreAppellations,
  scoreCellarWines,
  winesNeedingStyle,
} from '@/lib/foodPairingScorer'
import { toAppellationStyle } from '@/lib/wineStyles'
import { appellation, baseline, override, tag, wine } from './fixtures'

/** scoreAppellations for a fixture that must yield exactly one result. */
function scoreOne(...args: Parameters<typeof scoreAppellations>) {
  const [result] = scoreAppellations(...args)
  if (!result) throw new Error('expected a scored appellation')
  return result
}

const match = (
  slug: string,
  confidence = 1,
  category: FoodTagCategory = 'protein',
): FoodTagMatch => ({
  tag: tag(slug, [slug], { category }),
  matchedPhrase: slug,
  confidence,
})

describe('scoreAppellations', () => {
  it('scores every produced style independently and keeps all of them', () => {
    const app = appellation('a', ['red', 'white'])
    const result = scoreOne(
      [app],
      [match('steak')],
      [baseline('red', 'steak', 2), baseline('white', 'steak', -1)],
      [],
    )

    expect(result.styleScores.red?.score).toBe(2)
    // A style that scores <= 0 is still persisted — cellar matching reads it.
    expect(result.styleScores.white?.score).toBe(-1)
    expect(result.score).toBe(2)
    expect(result.drivingStyle).toBe('red')
    expect(result.positiveTagIds).toEqual(['tag-steak'])
  })

  it('returns every appellation that has wine_styles: no filter, no sort, no slice', () => {
    const apps = Array.from({ length: 40 }, (_, i) => appellation(`a${i}`, ['red']))
    const results = scoreAppellations(apps, [match('steak')], [baseline('red', 'steak', 2)], [])

    expect(results).toHaveLength(40)
    expect(results.map((r) => r.appellation.id)).toEqual(apps.map((a) => a.id)) // input order kept
  })

  it('returns non-positive appellations too instead of dropping them', () => {
    const result = scoreOne(
      [appellation('a', ['red'])],
      [match('dessert')],
      [baseline('red', 'dessert', -2)],
      [],
    )
    expect(result.score).toBe(-2)
  })

  it('skips appellations with null or empty wine_styles rather than guessing', () => {
    const results = scoreAppellations(
      [appellation('pending', null), appellation('empty', []), appellation('ok', ['red'])],
      [match('steak')],
      [baseline('red', 'steak', 2)],
      [],
    )
    expect(results.map((r) => r.appellation.id)).toEqual(['ok'])
  })

  it('scopes an override to its own style — never leaks onto a sibling style', () => {
    const app = appellation('a', ['red', 'white'])
    const result = scoreOne(
      [app],
      [match('goat-cheese')],
      [],
      [override('a', 'white', 'goat-cheese', 2)],
    )
    expect(result.styleScores.white?.score).toBe(2)
    expect(result.styleScores.red?.score).toBe(0)
  })

  it('scopes an override to its own appellation', () => {
    const results = scoreAppellations(
      [appellation('a', ['white']), appellation('b', ['white'])],
      [match('goat-cheese')],
      [],
      [override('a', 'white', 'goat-cheese', 2)],
    )
    expect(results.find((r) => r.appellation.id === 'a')?.score).toBe(2)
    expect(results.find((r) => r.appellation.id === 'b')?.score).toBe(0)
  })

  it('never lets a baseline-only style A and an override-only style B combine past either total', () => {
    const app = appellation('a', ['red', 'white'])
    const result = scoreOne(
      [app],
      [match('steak')],
      [baseline('red', 'steak', 2)], // style A: baseline only
      [override('a', 'white', 'steak', 2)], // style B: override only
    )

    expect(result.styleScores.red?.score).toBe(2)
    expect(result.styleScores.white?.score).toBe(2)
    expect(result.score).toBe(2) // the best single style — not 4
    expect(result.score).toBeLessThanOrEqual(
      Math.max(result.styleScores.red!.score, result.styleScores.white!.score),
    )
  })

  it('adds baseline and override within one style, weighted by match confidence', () => {
    const result = scoreOne(
      [appellation('a', ['white'])],
      [match('goat-cheese', 0.5)],
      [baseline('white', 'goat-cheese', 1)],
      [override('a', 'white', 'goat-cheese', 2)],
    )
    expect(result.score).toBeCloseTo(1.5) // (1 + 2) * 0.5
  })

  it('breaks style ties in favour of the first produced style', () => {
    const result = scoreOne([appellation('a', ['white', 'red'])], [], [], [])
    expect(result.drivingStyle).toBe('white')
  })
})

describe('scoreCellarWines', () => {
  // Appellation makes red + white; a curator suppressed the red for this dish and the white scores well.
  const app = appellation('mixed', ['red', 'white'])
  const matches = [match('chocolate')]
  const base = [baseline('red', 'chocolate', 1), baseline('white', 'chocolate', 2)]
  const suppress = [override('mixed', 'red', 'chocolate', -2)] // red nets 1 + -2 = -1
  const appellationResults = scoreAppellations([app], matches, base, suppress)

  it('drops the suppressed bottle but keeps the sibling style from the same appellation', () => {
    const red = wine('red-bottle', 'red', 'mixed')
    const white = wine('white-bottle', 'white', 'mixed')
    const cellar = scoreCellarWines([red, white], matches, appellationResults, base)

    // The appellation still shows up (its white is strong)…
    expect(appellationResults[0]!.drivingStyle).toBe('white')
    expect(appellationResults[0]!.score).toBeGreaterThan(0)
    // …but the owned RED bottle must never be recommended, while the WHITE is.
    expect(cellar.map((m) => m.wine.id)).toEqual(['white-bottle'])
    expect(cellar[0]!.drivingStyle).toBe('white')
    expect(cellar[0]!.score).toBe(appellationResults[0]!.styleScores.white!.score)
  })

  it('excludes a null-style bottle on a multi-style appellation — never a guess', () => {
    const styleless = wine('styleless', null, 'mixed')
    expect(scoreCellarWines([styleless], matches, appellationResults, base)).toEqual([])
    expect(winesNeedingStyle([styleless], appellationResults)).toEqual([styleless])
  })

  it('still scores a null-style bottle on a single-style appellation (no ambiguity)', () => {
    const single = appellation('single', ['white'])
    const results = scoreAppellations([single], matches, base, [])
    const styleless = wine('styleless', null, 'single')

    const cellar = scoreCellarWines([styleless], matches, results, base)
    expect(cellar).toHaveLength(1)
    expect(cellar[0]).toMatchObject({ drivingStyle: 'white', score: 2 })
    expect(winesNeedingStyle([styleless], results)).toEqual([])
  })

  it('excludes a bottle whose style is no longer one of its appellation styles (stale data)', () => {
    const stale = wine('stale', 'sparkling', 'mixed')
    expect(scoreCellarWines([stale], matches, appellationResults, base)).toEqual([])
  })

  it('does not fall back to the appellation best style for a bottle with a non-produced style', () => {
    // dessert -> sweet, which the appellation does not make.
    const sweet = wine('sweet', 'dessert', 'mixed')
    expect(scoreCellarWines([sweet], matches, appellationResults, base)).toEqual([])
  })

  it('finds a bottle from an appellation ranked far outside any UI display cap', () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      appellation(`a${i}`, ['red'], { name: `App ${i}` }),
    )
    // a0 scores highest … a29 lowest, via decreasing override strength on the last ones.
    const overrides = many.slice(0, 12).map((a) => override(a.id, 'red', 'steak', 2))
    const steak = [match('steak')]
    const steakBase = [baseline('red', 'steak', 1)]

    const results = scoreAppellations(many, steak, steakBase, overrides)
    const shown = results
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12) // a UI cap

    const lowRanked = wine('low', 'red', 'a29')
    expect(shown.some((r) => r.appellation.id === 'a29')).toBe(false) // not displayed…
    expect(results).toHaveLength(30) // …but scoreAppellations never pre-truncated,
    const cellar = scoreCellarWines([lowRanked], steak, results, steakBase)
    expect(cellar.map((m) => m.wine.id)).toEqual(['low']) // …so the bottle still matches.
  })

  it('scores a styled bottle with no appellation from the style-only baseline', () => {
    const cellar = scoreCellarWines(
      [wine('plain-red', 'red', null)],
      [match('steak')],
      [],
      [baseline('red', 'steak', 2)],
    )
    expect(cellar).toHaveLength(1)
    expect(cellar[0]).toMatchObject({ drivingStyle: 'red', score: 2 })
  })

  it('maps wines.style spellings onto appellation styles (rosé -> rose, dessert -> sweet)', () => {
    expect(toAppellationStyle('rosé')).toBe('rose')
    expect(toAppellationStyle('dessert')).toBe('sweet')

    const cellar = scoreCellarWines(
      [wine('r', 'rosé', null), wine('d', 'dessert', null)],
      [match('spicy')],
      [],
      [baseline('rose', 'spicy', 1), baseline('sweet', 'spicy', 2)],
    )
    expect(cellar.map((m) => [m.wine.id, m.drivingStyle])).toEqual([
      ['d', 'sweet'],
      ['r', 'rose'],
    ])
  })

  it('excludes a bottle with neither appellation nor style — not disguised as red', () => {
    // Regression: UserWine defaults a missing style to 'red', which would score here.
    const cellar = scoreCellarWines(
      [wine('mystery', null, null)],
      [match('steak')],
      [],
      [baseline('red', 'steak', 2)],
    )
    expect(cellar).toEqual([])
  })

  it('falls through to the style baseline when the appellation has no wine_styles', () => {
    const pending = appellation('pending', null)
    const results = scoreAppellations(
      [pending],
      [match('steak')],
      [baseline('red', 'steak', 2)],
      [],
    )
    expect(results).toEqual([]) // skipped by the appellation scorer

    const styled = scoreCellarWines(
      [wine('styled', 'red', 'pending'), wine('styleless', null, 'pending')],
      [match('steak')],
      results,
      [baseline('red', 'steak', 2)],
    )
    expect(styled.map((m) => m.wine.id)).toEqual(['styled'])
  })

  it('drops bottles that score zero or below and sorts the rest by score', () => {
    const cellar = scoreCellarWines(
      [
        wine('neutral', 'white', null),
        wine('clash', 'red', null),
        wine('best', 'sparkling', null),
        wine('good', 'rosé', null),
      ],
      [match('oysters')],
      [],
      [
        baseline('red', 'oysters', -1),
        baseline('sparkling', 'oysters', 2),
        baseline('rose', 'oysters', 1),
      ],
    )
    expect(cellar.map((m) => m.wine.id)).toEqual(['best', 'good'])
  })
})

describe('groupByDrivingTags', () => {
  const surfAndTurf = [match('steak'), match('shrimp')]
  const item = (id: string, positiveTagIds: string[]) => ({ id, positiveTagIds })

  it('groups by which matched tags drove each item, with a shared group for both', () => {
    const groups = groupByDrivingTags(
      [
        item('both', ['tag-steak', 'tag-shrimp']),
        item('meat', ['tag-steak']),
        item('fish', ['tag-shrimp']),
        item('meat2', ['tag-steak']),
      ],
      surfAndTurf,
    )

    expect(groups.map((g) => [g.coversAll, g.tagIds, g.items.map((i) => i.id)])).toEqual([
      [true, ['tag-steak', 'tag-shrimp'], ['both']],
      [false, ['tag-steak'], ['meat', 'meat2']],
      [false, ['tag-shrimp'], ['fish']],
    ])
  })

  it('does not split by modifier tags — only main ingredients make separate parts', () => {
    const modifiers = [
      match('salmon', 1, 'seafood'),
      match('lemon', 1, 'vegetable_produce'),
      match('spicy', 1, 'flavor_profile'),
      match('grilled', 1, 'preparation'),
    ]
    const groups = groupByDrivingTags(
      [item('a', ['tag-salmon', 'tag-lemon']), item('b', ['tag-spicy'])],
      modifiers,
    )
    expect(groups).toHaveLength(1) // one main ingredient: nothing to split
    expect(groups[0]!.items.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('files items driven only by modifiers in a final ungrouped list', () => {
    const matches = [
      match('steak', 1, 'protein'),
      match('shrimp', 1, 'seafood'),
      match('spicy', 1, 'flavor_profile'),
    ]
    const groups = groupByDrivingTags(
      [
        item('side-only', ['tag-spicy']),
        item('meat', ['tag-steak']),
        item('both', ['tag-steak', 'tag-shrimp']),
      ],
      matches,
    )
    expect(groups.map((g) => [g.coversAll, g.tagIds, g.items.map((i) => i.id)])).toEqual([
      [true, ['tag-steak', 'tag-shrimp'], ['both']],
      [false, ['tag-steak'], ['meat']],
      [false, [], ['side-only']],
    ])
  })

  it('returns one plain group for a single matched tag, and nothing for no items', () => {
    const single = groupByDrivingTags([item('a', ['tag-steak'])], [match('steak')])
    expect(single).toHaveLength(1)
    expect(single[0]!.coversAll).toBe(false)
    expect(groupByDrivingTags([], surfAndTurf)).toEqual([])
  })
})

describe('compareAppellationResults', () => {
  const resultFor = (id: string, styles: Parameters<typeof appellation>[1]) =>
    scoreOne(
      [appellation(id, styles, { name: id })],
      [match('steak')],
      [baseline('red', 'steak', 2), baseline('white', 'steak', 2)],
      [],
    )

  it('ranks by score first', () => {
    const strong = scoreOne(
      [appellation('strong', ['red'])],
      [match('steak')],
      [baseline('red', 'steak', 2)],
      [override('strong', 'red', 'steak', 1)],
    )
    expect(compareAppellationResults(strong, resultFor('plain', ['red']))).toBeLessThan(0)
  })

  it('on a tie prefers the specialist appellation, then falls back to name', () => {
    const specialist = resultFor('zeta', ['red'])
    const generalist = resultFor('alpha', ['red', 'white'])
    expect(compareAppellationResults(specialist, generalist)).toBeLessThan(0)

    const first = resultFor('alpha', ['red'])
    const second = resultFor('beta', ['red'])
    expect(compareAppellationResults(first, second)).toBeLessThan(0)
  })
})
