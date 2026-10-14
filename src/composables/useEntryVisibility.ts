import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'

/**
 * Whether a region or appellation is currently shown outside the manage portal (switched on, and
 * its region too). For things that point at an entry by id — a bottle's origin, a map area — and
 * must not link to a page that is hidden. Until a store has loaded nothing is known to be hidden,
 * so a link never flickers off and on while the page loads.
 */
export function useEntryVisibility() {
  const { regions, loaded: regionsLoaded } = storeToRefs(useWineRegionsStore())
  const { appellations, loaded: appellationsLoaded } = storeToRefs(useWineAppellationsStore())

  const visibleRegionIds = computed(() => new Set(regions.value.map((region) => region.id)))
  const visibleAppellationIds = computed(
    () => new Set(appellations.value.map((appellation) => appellation.id)),
  )

  function isRegionShown(id: string) {
    return !regionsLoaded.value || visibleRegionIds.value.has(id)
  }

  function isAppellationShown(id: string) {
    return !appellationsLoaded.value || visibleAppellationIds.value.has(id)
  }

  /** Countries are never switched off. */
  function isTargetShown(
    target: { type: 'country' | 'region' | 'appellation'; id: string } | null,
  ) {
    if (target?.type === 'region') return isRegionShown(target.id)
    if (target?.type === 'appellation') return isAppellationShown(target.id)
    return true
  }

  return {
    visibleRegionIds,
    visibleAppellationIds,
    regionsLoaded,
    appellationsLoaded,
    isRegionShown,
    isAppellationShown,
    isTargetShown,
  }
}
