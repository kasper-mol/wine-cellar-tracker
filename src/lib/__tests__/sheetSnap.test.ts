import { describe, expect, it } from 'vitest'
import {
  clampSheetHeight,
  nextSnap,
  settleSheet,
  sheetHeights,
  type SheetHeights,
} from '@/lib/sheetSnap'

describe('sheetHeights', () => {
  it('gives peek, half and full for a phone', () => {
    // iPhone-ish: 844 tall, 34px home indicator, status bar + top bar = 103.
    const heights = sheetHeights(844, { peek: 176 + 34, topInset: 103 })
    expect(heights).toEqual({ peek: 210, half: 422, full: 741 })
  })

  it('keeps the three snaps apart on a very short screen', () => {
    const heights = sheetHeights(300, { peek: 210, topInset: 103 })
    expect(heights.half).toBeGreaterThan(heights.peek)
    expect(heights.full).toBeGreaterThan(heights.half)
  })
})

describe('clampSheetHeight', () => {
  const heights: SheetHeights = { peek: 200, half: 400, full: 700 }

  it('stays between peek and full', () => {
    expect(clampSheetHeight(50, heights)).toBe(200)
    expect(clampSheetHeight(450, heights)).toBe(450)
    expect(clampSheetHeight(900, heights)).toBe(700)
  })
})

describe('settleSheet', () => {
  const heights: SheetHeights = { peek: 200, half: 400, full: 700 }

  it('settles on the nearest snap when let go slowly', () => {
    expect(settleSheet(230, 0, heights)).toBe('peek')
    expect(settleSheet(330, 0, heights)).toBe('half')
    expect(settleSheet(560, 0, heights)).toBe('full')
    expect(settleSheet(540, 0, heights)).toBe('half')
  })

  it('carries a fling upwards on to the next snap', () => {
    expect(settleSheet(260, 1.2, heights)).toBe('half')
    expect(settleSheet(420, 1.5, heights)).toBe('full')
  })

  it('carries a fling downwards back', () => {
    expect(settleSheet(600, -1, heights)).toBe('half')
    expect(settleSheet(360, -1.2, heights)).toBe('peek')
  })

  it('does not overshoot the ends', () => {
    expect(settleSheet(690, 5, heights)).toBe('full')
    expect(settleSheet(205, -5, heights)).toBe('peek')
  })
})

describe('nextSnap', () => {
  it('opens step by step, then folds back to half', () => {
    expect(nextSnap('peek')).toBe('half')
    expect(nextSnap('half')).toBe('full')
    expect(nextSnap('full')).toBe('half')
  })
})
