import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore } from '@/stores/main'
import { useWineRegionsStore } from '@/stores/wineRegions'
import type { UserWine } from '@/types/wines'

export interface Holding {
  labels: number
  bottles: number
}

const EMPTY: Holding = { labels: 0, bottles: 0 }

/** What the cellar holds, grouped for the encyclopedia — the link that ties
 * the reference data back to the user's own bottles. */
export function useCellarHoldings() {
  const mainStore = useMainStore()
  const wineRegionsStore = useWineRegionsStore()
  const { userWines } = storeToRefs(mainStore)
  const { regions } = storeToRefs(wineRegionsStore)

  const countryIdByRegion = computed(
    () => new Map(regions.value.map((region) => [region.id, region.country_id])),
  )

  function group(keyOf: (wine: UserWine) => string | null | undefined) {
    const map = new Map<string, Holding>()
    for (const wine of userWines.value) {
      const key = keyOf(wine)
      if (!key) continue
      const current = map.get(key) ?? { labels: 0, bottles: 0 }
      current.labels += 1
      current.bottles += wine.quantity
      map.set(key, current)
    }
    return map
  }

  const heldByRegion = computed(() => group((wine) => wine.regionId))
  const heldByCountry = computed(() =>
    group((wine) => (wine.regionId ? countryIdByRegion.value.get(wine.regionId) : null)),
  )
  const heldByAppellation = computed(() => group((wine) => wine.appellationId))

  const heldAppellationIds = computed(
    () =>
      new Set(
        userWines.value.map((wine) => wine.appellationId).filter((id): id is string => Boolean(id)),
      ),
  )

  function holdingForCountry(id: string | null | undefined): Holding {
    return (id && heldByCountry.value.get(id)) || EMPTY
  }

  function holdingForRegion(id: string | null | undefined): Holding {
    return (id && heldByRegion.value.get(id)) || EMPTY
  }

  function holdingForAppellation(id: string | null | undefined): Holding {
    return (id && heldByAppellation.value.get(id)) || EMPTY
  }

  function winesForAppellation(id: string) {
    return userWines.value.filter((wine) => wine.appellationId === id)
  }

  /** "4 labels" / "—" for the outer column of an index row. */
  function holdingLabel(holding: Holding) {
    if (!holding.labels) return '—'
    return `${holding.labels} label${holding.labels === 1 ? '' : 's'}`
  }

  return {
    userWines,
    heldAppellationIds,
    holdingForCountry,
    holdingForRegion,
    holdingForAppellation,
    winesForAppellation,
    holdingLabel,
  }
}
