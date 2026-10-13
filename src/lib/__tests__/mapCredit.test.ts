import { describe, expect, it } from 'vitest'
import { MAP_DATA_SOURCES } from '@/content/mapDataSources'
import { creditForSources } from '@/lib/mapCredit'

describe('creditForSources', () => {
  it('gives no credit for hand-drawn maps', () => {
    expect(creditForSources([])).toEqual([])
    expect(creditForSources(null)).toEqual([])
    expect(creditForSources(undefined)).toEqual([])
  })

  it('credits INAO and OpenStreetMap, with links, for the French source', () => {
    const parts = creditForSources(['inao-fr'])
    const text = parts.map((part) => part.text).join('')

    expect(text).toContain('INAO')
    expect(text).toContain('Licence Ouverte 2.0')
    expect(text).toContain('OpenStreetMap contributors')
    expect(parts.find((part) => part.text === 'OpenStreetMap contributors')?.href).toBe(
      'https://www.openstreetmap.org/copyright',
    )
  })

  it('ignores unknown ids and repeats', () => {
    expect(creditForSources(['nope'])).toEqual([])
    expect(creditForSources(['inao-fr', 'inao-fr'])).toEqual(creditForSources(['inao-fr']))
  })

  it('only ever links to https addresses', () => {
    for (const source of MAP_DATA_SOURCES) {
      for (const part of source.credit) {
        if (part.href) expect(part.href.startsWith('https://')).toBe(true)
      }
    }
  })
})
