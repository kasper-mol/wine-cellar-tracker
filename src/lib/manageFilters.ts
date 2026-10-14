import type { WineAppellationRecord } from '@/types/wineAppellations'
import type { WineRegionRecord } from '@/types/wineRegions'

/** The "no filter" value of the manage pages' country and region selects. */
export const ALL_FILTER = 'all'

export function filterRegionsByCountry(regions: WineRegionRecord[], countryId: string) {
  if (countryId === ALL_FILTER) return regions
  return regions.filter((region) => region.country_id === countryId)
}

/**
 * Appellations in a country and/or region. The country comes from the live region rows, not the
 * copy embedded in the appellation, so an appellation follows its region when that region is moved.
 */
export function filterAppellationsByOrigin(
  appellations: WineAppellationRecord[],
  regions: WineRegionRecord[],
  countryId: string,
  regionId: string,
) {
  if (countryId === ALL_FILTER && regionId === ALL_FILTER) return appellations
  const countryByRegion = new Map(regions.map((region) => [region.id, region.country_id]))
  return appellations.filter((appellation) => {
    if (regionId !== ALL_FILTER && appellation.region_id !== regionId) return false
    if (countryId === ALL_FILTER) return true
    const country = countryByRegion.get(appellation.region_id) ?? appellation.region?.country_id
    return country === countryId
  })
}
