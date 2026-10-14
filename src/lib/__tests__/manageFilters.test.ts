import { describe, expect, it } from 'vitest'
import { ALL_FILTER, filterAppellationsByOrigin, filterRegionsByCountry } from '@/lib/manageFilters'
import { appellation, region } from '@/lib/__tests__/fixtures'

const bordeaux = region('bordeaux', { country_id: 'fr' })
const alsace = region('alsace', { country_id: 'fr' })
const tuscany = region('tuscany', { country_id: 'it' })
const regions = [bordeaux, alsace, tuscany]

const margaux = appellation('margaux', ['red'], { region_id: 'bordeaux', region: bordeaux })
const riesling = appellation('riesling', ['white'], { region_id: 'alsace', region: alsace })
const chianti = appellation('chianti', ['red'], { region_id: 'tuscany', region: tuscany })
const appellations = [margaux, riesling, chianti]

describe('filterRegionsByCountry', () => {
  it('returns everything for "all" and narrows to one country otherwise', () => {
    expect(filterRegionsByCountry(regions, ALL_FILTER)).toEqual(regions)
    expect(filterRegionsByCountry(regions, 'fr').map((r) => r.id)).toEqual(['bordeaux', 'alsace'])
    expect(filterRegionsByCountry(regions, 'de')).toEqual([])
  })
})

describe('filterAppellationsByOrigin', () => {
  const ids = (list: { id: string }[]) => list.map((a) => a.id)

  it('returns everything when no filter is on', () => {
    expect(filterAppellationsByOrigin(appellations, regions, ALL_FILTER, ALL_FILTER)).toEqual(
      appellations,
    )
  })

  it('filters by country', () => {
    expect(ids(filterAppellationsByOrigin(appellations, regions, 'fr', ALL_FILTER))).toEqual([
      'margaux',
      'riesling',
    ])
    expect(ids(filterAppellationsByOrigin(appellations, regions, 'it', ALL_FILTER))).toEqual([
      'chianti',
    ])
  })

  it('filters by region, with or without a country', () => {
    expect(ids(filterAppellationsByOrigin(appellations, regions, ALL_FILTER, 'alsace'))).toEqual([
      'riesling',
    ])
    expect(ids(filterAppellationsByOrigin(appellations, regions, 'fr', 'alsace'))).toEqual([
      'riesling',
    ])
    expect(filterAppellationsByOrigin(appellations, regions, 'it', 'alsace')).toEqual([])
  })

  it('follows the live region row when an appellation still embeds the old country', () => {
    const movedRegion = region('bordeaux', { country_id: 'it' })
    const stale = appellation('margaux', ['red'], { region_id: 'bordeaux', region: bordeaux })
    expect(ids(filterAppellationsByOrigin([stale], [movedRegion], 'it', ALL_FILTER))).toEqual([
      'margaux',
    ])
    expect(filterAppellationsByOrigin([stale], [movedRegion], 'fr', ALL_FILTER)).toEqual([])
  })

  it('falls back to the embedded region when the live regions are not loaded', () => {
    expect(ids(filterAppellationsByOrigin(appellations, [], 'fr', ALL_FILTER))).toEqual([
      'margaux',
      'riesling',
    ])
  })
})
