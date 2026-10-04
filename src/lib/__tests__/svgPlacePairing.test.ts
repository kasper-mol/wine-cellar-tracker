import { describe, expect, it } from 'vitest'
import { pairDotsWithTexts } from '@/lib/svgPlacePairing'

const text = (id: string, x: number, y: number, width = 40, height = 10) => ({
  id,
  x,
  y,
  width,
  height,
})
const dot = (id: string, x: number, y: number) => ({ id, x, y })

describe('pairDotsWithTexts', () => {
  it('pairs each name with the dot next to it', () => {
    const result = pairDotsWithTexts(
      [dot('d-paris', 100, 100), dot('d-lyon', 300, 300)],
      [text('t-lyon', 310, 295), text('t-paris', 110, 95)],
    )

    expect(result.pairs).toEqual([
      { textElementId: 't-lyon', dotElementId: 'd-lyon' },
      { textElementId: 't-paris', dotElementId: 'd-paris' },
    ])
    expect(result.unpairedDotIds).toEqual([])
    expect(result.unpairedTextIds).toEqual([])
  })

  it('treats a dot inside a name box as distance zero', () => {
    const result = pairDotsWithTexts(
      [dot('near', 120, 105), dot('far', 118, 150)],
      [text('t', 100, 100)],
    )
    expect(result.pairs).toEqual([{ textElementId: 't', dotElementId: 'near' }])
  })

  it('never gives one dot to two names', () => {
    const result = pairDotsWithTexts(
      [dot('only', 100, 100)],
      [text('close', 102, 98), text('further', 130, 98)],
    )
    expect(result.pairs).toEqual([{ textElementId: 'close', dotElementId: 'only' }])
    expect(result.unpairedTextIds).toEqual(['further'])
  })

  it('lets the closer pair win even when another name is listed first', () => {
    // a-name is nearer to dot-2 than b-name is, but dot-1 is nearest to b-name.
    const result = pairDotsWithTexts(
      [dot('dot-1', 200, 100), dot('dot-2', 100, 100)],
      [text('a-name', 80, 100, 10, 10), text('b-name', 205, 100, 10, 10)],
    )
    expect(result.pairs).toEqual([
      { textElementId: 'a-name', dotElementId: 'dot-2' },
      { textElementId: 'b-name', dotElementId: 'dot-1' },
    ])
  })

  it('rejects pairs beyond the maximum distance', () => {
    const result = pairDotsWithTexts([dot('d', 0, 0)], [text('t', 500, 500)], 20)
    expect(result.pairs).toEqual([])
    expect(result.unpairedDotIds).toEqual(['d'])
    expect(result.unpairedTextIds).toEqual(['t'])
  })

  it('is deterministic when distances tie', () => {
    const a = pairDotsWithTexts(
      [dot('d1', 0, 0), dot('d2', 0, 0)],
      [text('t1', 0, 0, 0, 0), text('t2', 0, 0, 0, 0)],
    )
    const b = pairDotsWithTexts(
      [dot('d2', 0, 0), dot('d1', 0, 0)],
      [text('t2', 0, 0, 0, 0), text('t1', 0, 0, 0, 0)],
    )
    expect(a.pairs).toEqual(b.pairs)
  })

  it('handles empty input', () => {
    expect(pairDotsWithTexts([], [])).toEqual({
      pairs: [],
      unpairedDotIds: [],
      unpairedTextIds: [],
    })
  })
})
