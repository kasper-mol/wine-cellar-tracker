<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import CountryOverview from '@/components/WineCountries/CountryOverview.vue'
import CountryRegionsList from '@/components/WineCountries/CountryRegionsList.vue'
import CountryAppellationsList from '@/components/WineCountries/CountryAppellationsList.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

defineOptions({
  name: 'CountryDetailPage',
})

const route = useRoute()
const router = useRouter()
const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)

const countryId = route.params.id as string

const country = computed(() => countries.value.find((c) => c.id === countryId))

const countryRegions = computed(() => {
  return regions.value
    .filter((r) => r.country_id === countryId)
    .map((region) => {
      const regionAppellations = appellations.value.filter((a) => a.region_id === region.id)
      return {
        ...region,
        appellationCount: regionAppellations.length,
      }
    })
})

const countryAppellations = computed(() => {
  const regionLookup = new Map(regions.value.map((region) => [region.id, region]))
  return appellations.value
    .filter((appellation) => {
      const region = appellation.region ?? regionLookup.get(appellation.region_id)
      return region?.country_id === countryId
    })
    .map((appellation) => {
      const region = appellation.region ?? regionLookup.get(appellation.region_id)
      return {
        id: appellation.id,
        name: appellation.name,
        regionName: region?.name ?? 'Unknown region',
        grapeCount: appellation.grapes?.length ?? 0,
      }
    })
})

onMounted(async () => {
  await Promise.all([
    wineCountriesStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})

function navigateToRegion(regionId: string) {
  router.push(`/region/${regionId}`)
}

function navigateToAppellation(appellationId: string) {
  router.push(`/appellation/${appellationId}`)
}
</script>

<template>
  <div v-if="!country" class="container py-12">
    <p class="text-muted-foreground">Country not found.</p>
  </div>

  <div v-else class="min-h-screen">
    <div class="container max-w-6xl space-y-12">
      <Button variant="ghost" class="mb-4" @click="router.push('/countries')">
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to Countries
      </Button>

      <CountryOverview
        :country="country"
        :region-count="countryRegions.length"
        :appellation-count="countryAppellations.length"
      />

      <CountryRegionsList :regions="countryRegions" @select-region="navigateToRegion" />

      <CountryAppellationsList
        :appellations="countryAppellations"
        @select-appellation="navigateToAppellation"
      />
    </div>
  </div>
</template>
