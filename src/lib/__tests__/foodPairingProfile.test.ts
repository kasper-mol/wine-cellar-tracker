import { describe, expect, it } from 'vitest'
import type { EditorialDish } from '@/lib/foodPairingEditorial'
import { buildAppellationPairings, buildPairingProfile } from '@/lib/foodPairingProfile'
import { baseline, override, tag } from './fixtures'

const tags = [tag('oysters'), tag('steak'), tag('goat-cheese'), tag('salmon')]

describe('buildPairingProfile', () => {
  it('lists, per produced style, tags at or above the affinity floor', () => {
    const profile = buildPairingProfile(
      ['red', 'white'],
      tags,
      [
        baseline('red', 'steak', 2),
        baseline('red', 'salmon', 1), // below the floor
        baseline('white', 'oysters', 2),
      ],
      [],
    )
    expect(profile.map((entry) => [entry.style, entry.tags.map((t) => t.tag.slug)])).toEqual([
      ['red', ['steak']],
      ['white', ['oysters']],
    ])
  })

  it('adds a style-scoped override to the baseline and puts curated tags first', () => {
    const profile = buildPairingProfile(
      ['white'],
      tags,
      [baseline('white', 'oysters', 2), baseline('white', 'goat-cheese', 1)],
      [override('a', 'white', 'goat-cheese', 1)], // 1 + 1 = 2, and curated
    )
    const white = profile[0]!
    expect(white.tags.map((t) => [t.tag.slug, t.affinity, t.curated])).toEqual([
      ['goat-cheese', 2, true],
      ['oysters', 2, false],
    ])
  })

  it("never shows another style's baseline or override", () => {
    const profile = buildPairingProfile(
      ['red'],
      tags,
      [baseline('white', 'oysters', 2)],
      [override('a', 'white', 'goat-cheese', 2)],
    )
    expect(profile).toEqual([])
  })

  it('drops a curated suppression and returns nothing for a null style list', () => {
    expect(
      buildPairingProfile(
        ['red'],
        tags,
        [baseline('red', 'steak', 2)],
        [override('a', 'red', 'steak', -2)],
      ),
    ).toEqual([])
    expect(buildPairingProfile(null, tags, [baseline('red', 'steak', 2)], [])).toEqual([])
  })

  it('caps each style at the limit', () => {
    const profile = buildPairingProfile(
      ['red'],
      tags,
      tags.map((t) => baseline('red', t.slug, 2)),
      [],
      { limit: 2 },
    )
    expect(profile[0]!.tags).toHaveLength(2)
  })
})

describe('buildAppellationPairings: a white and a red from one appellation are different wines', () => {
  const vocab = [tag('game'), tag('white-fish', ['fish'], { category: 'seafood' }), tag('pork')]
  const base = [
    baseline('red', 'game', 2),
    baseline('red', 'pork', 2),
    baseline('white', 'white-fish', 2),
    baseline('white', 'pork', 2),
  ]
  const dish = (phrase: string, slug: string): EditorialDish => ({
    phrase,
    tagIds: [`tag-${slug}`],
    anchorTagIds: [`tag-${slug}`],
  })
  const dishes = [
    dish('grilled river fish', 'white-fish'),
    dish('pork rillettes', 'pork'),
    dish('rabbit stew', 'game'),
    { phrase: 'choucroute', tagIds: [], anchorTagIds: [] },
  ]

  it("lists each style's own classic dishes beside its tags, and the rest as any-style", () => {
    const { styles, unattributed } = buildAppellationPairings(
      ['white', 'red'],
      vocab,
      base,
      [],
      dishes,
    )
    expect(styles.map((s) => [s.style, s.dishes, s.tags.map((t) => t.tag.slug)])).toEqual([
      ['white', ['grilled river fish', 'pork rillettes'], ['white-fish', 'pork']],
      ['red', ['pork rillettes', 'rabbit stew'], ['game', 'pork']],
    ])
    expect(unattributed).toEqual(['choucroute'])
  })

  it('leaves the flat prose alone for a single-style appellation: nothing is split or repeated', () => {
    const { styles, unattributed } = buildAppellationPairings(['red'], vocab, base, [], dishes)
    expect(styles.map((s) => [s.style, s.dishes])).toEqual([['red', []]])
    expect(unattributed).toEqual([])
  })

  it('a curated override makes the style own the dish', () => {
    const { styles } = buildAppellationPairings(
      ['white', 'red'],
      vocab,
      base,
      [override('a', 'red', 'white-fish', 1)], // red rated fish at +1 by an editor
      dishes,
    )
    expect(styles.find((s) => s.style === 'red')!.dishes).toContain('grilled river fish')
  })

  it('omits a style with nothing to say and copes with no styles at all', () => {
    const { styles } = buildAppellationPairings(['white', 'sparkling'], vocab, base, [], dishes)
    expect(styles.map((s) => s.style)).toEqual(['white'])
    expect(buildAppellationPairings(null, vocab, base, [], dishes)).toEqual({
      styles: [],
      unattributed: [],
    })
  })
})
