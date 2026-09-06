<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Breadcrumb from '@/components/editorial/Breadcrumb.vue'
import CountryOverview from '@/components/WineCountries/CountryOverview.vue'
import CountryRegionsList from '@/components/WineCountries/CountryRegionsList.vue'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineMapsStore } from '@/stores/wineMaps'

defineOptions({
  name: 'CountryDetailPage',
})

const route = useRoute()
const router = useRouter()
const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const wineMapsStore = useWineMapsStore()

const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)
const { maps: wineMaps } = storeToRefs(wineMapsStore)
const { holdingForCountry, holdingForRegion, holdingLabel } = useCellarHoldings()

const countryId = route.params.id as string

const country = computed(() => countries.value.find((c) => c.id === countryId))

const countryMap = computed(() => {
  if (!country.value) return null
  return (
    wineMaps.value.find(
      (map) => map.owner_wine_country_id === country.value?.id && map.is_active,
    ) ?? null
  )
})

const countryMapKey = computed(() => countryMap.value?.key ?? null)

const countryRegions = computed(() =>
  regions.value
    .filter((r) => r.country_id === countryId)
    .map((region) => ({
      id: region.id,
      name: region.name,
      appellationCount: appellations.value.filter((a) => a.region_id === region.id).length,
      holding: holdingLabel(holdingForRegion(region.id)),
    })),
)

const appellationCount = computed(() => {
  const regionIds = new Set(countryRegions.value.map((region) => region.id))
  return appellations.value.filter(
    (appellation) =>
      appellation.region?.country_id === countryId || regionIds.has(appellation.region_id),
  ).length
})

const holding = computed(() => holdingForCountry(countryId))

onMounted(async () => {
  await Promise.all([
    wineCountriesStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
    wineMapsStore.fetchMapsForCountry(countryId),
  ])
})

function navigateToRegion(regionId: string) {
  router.push(`/region/${regionId}`)
}
</script>

<template>
  <p v-if="!country" class="text-sm text-foreground/[0.55]">Country not found.</p>

  <div v-else>
    <Breadcrumb :items="[{ label: 'Countries', to: '/countries' }, { label: country.name }]" />

    <CountryOverview
      :country="country"
      :region-count="countryRegions.length"
      :appellation-count="appellationCount"
      :labels-held="holding.labels"
      :bottles-held="holding.bottles"
      :map-key="countryMapKey"
    />

    <CountryRegionsList
      :country-name="country.name"
      :regions="countryRegions"
      @select-region="navigateToRegion"
    />
  </div>
</template>
