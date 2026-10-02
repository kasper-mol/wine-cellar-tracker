import { describe, expect, it } from 'vitest'
import { isMultiStyle, styleFacts } from '@/lib/appellationStyleView'

const shared = {
  style_summary: 'Full-bodied and warm reds.',
  drinking_window: '8–20 years',
  signature_grapes: ['Grenache', 'Clairette'],
}

describe('isMultiStyle', () => {
  it('is true only for more than one style', () => {
    expect(isMultiStyle({ wine_styles: ['red', 'white'] })).toBe(true)
    expect(isMultiStyle({ wine_styles: ['red'] })).toBe(false)
    expect(isMultiStyle({ wine_styles: null })).toBe(false)
  })
})

describe('styleFacts', () => {
  it("uses the style's own text where written", () => {
    const facts = styleFacts(shared, {
      style_summary: 'Rich, floral whites.',
      drinking_window: '2–6 years',
      signature_grapes: ['Clairette'],
    })
    expect(facts).toEqual({
      summary: 'Rich, floral whites.',
      drinkingWindow: '2–6 years',
      grapes: ['Clairette'],
      summaryIsShared: false,
      drinkingWindowIsShared: false,
      grapesAreShared: false,
    })
  })

  it('falls back to the whole-appellation text, flagged as shared', () => {
    const facts = styleFacts(shared, null)
    expect(facts).toMatchObject({
      summary: 'Full-bodied and warm reds.',
      drinkingWindow: '8–20 years',
      grapes: ['Grenache', 'Clairette'],
      summaryIsShared: true,
      drinkingWindowIsShared: true,
      grapesAreShared: true,
    })
  })

  it('falls back field by field, and treats blank or empty values as unwritten', () => {
    const facts = styleFacts(shared, {
      style_summary: '   ',
      drinking_window: '3–8 years',
      signature_grapes: [],
    })
    expect(facts).toMatchObject({
      summary: 'Full-bodied and warm reds.',
      summaryIsShared: true,
      drinkingWindow: '3–8 years',
      drinkingWindowIsShared: false,
      grapes: ['Grenache', 'Clairette'],
      grapesAreShared: true,
    })
  })

  it('is not "shared" when there is nothing at all to show', () => {
    const facts = styleFacts(
      { style_summary: null, drinking_window: null, signature_grapes: null },
      null,
    )
    expect(facts).toEqual({
      summary: null,
      drinkingWindow: null,
      grapes: [],
      summaryIsShared: false,
      drinkingWindowIsShared: false,
      grapesAreShared: false,
    })
  })
})
