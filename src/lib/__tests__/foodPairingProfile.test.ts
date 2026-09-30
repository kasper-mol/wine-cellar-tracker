import { describe, expect, it } from 'vitest'
import { buildPairingProfile } from '@/lib/foodPairingProfile'
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
