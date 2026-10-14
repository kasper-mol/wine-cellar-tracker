import type { WineAppellationRecord } from '@/types/wineAppellations'
import type { WineRegionRecord } from '@/types/wineRegions'

type RegionFlag = Pick<WineRegionRecord, 'is_active'>

/** Outside the manage portal a region shows only while its own flag is on. */
export function isRegionVisible(region: RegionFlag): boolean {
  return region.is_active
}

/**
 * An appellation shows only while its own flag AND its region's flag are on. Switching a
 * region off therefore hides its appellations without touching their flags, and switching it
 * back on restores each one as it was.
 *
 * `region` is the live region row when the caller has it (fresher than the copy embedded in the
 * appellation). Without either, only the appellation's own flag counts.
 */
export function isAppellationVisible(
  appellation: Pick<WineAppellationRecord, 'is_active' | 'region'>,
  region?: RegionFlag | null,
): boolean {
  if (!appellation.is_active) return false
  const parent = region ?? appellation.region
  return parent ? parent.is_active : true
}
