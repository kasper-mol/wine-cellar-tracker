<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Breadcrumb from '@/components/editorial/Breadcrumb.vue'
import RegionOverview from '@/components/WineRegions/RegionOverview.vue'
import VintageRatingsTable from '@/components/vintageRatings/VintageRatingsTable.vue'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { getVintageRatingsBySourceForTarget } from '@/services/vintageRatings'
import type { VintageRatingsBySource } from '@/types/vintageRatings'

defineOptions({
  name: 'RegionDetailPage',
})

const route = useRoute()
const router = useRouter()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const wineCountriesStore = useWineCountriesStore()

const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)
const { countries } = storeToRefs(wineCountriesStore)

const regionId = route.params.id as string
const vintageSources = ref<VintageRatingsBySource[]>([])

const region = computed(() => regions.value.find((r) => r.id === regionId))

const country = computed(() => {
  const regionValue = region.value
  if (!regionValue) return null
  return regionValue.country ?? countries.value.find((c) => c.id === regionValue.country_id) ?? null
})

const regionAppellations = computed(() =>
  appellations.value
    .filter((a) => a.region_id === regionId)
    .map((appellation) => ({ id: appellation.id, name: appellation.name })),
)

onMounted(async () => {
  await Promise.all([
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
    wineCountriesStore.loadAll(),
  ])

  if (region.value) {
    vintageSources.value = await getVintageRatingsBySourceForTarget({
      region_id: region.value.id,
    })
  }
})

function navigateToAppellation(appellationId: string) {
  router.push(`/appellation/${appellationId}`)
}
</script>

<template>
  <p v-if="!region" class="text-sm text-foreground/[0.55]">Region not found.</p>

  <div v-else>
    <Breadcrumb
      :items="[
        { label: 'Countries', to: '/countries' },
        ...(country ? [{ label: country.name, to: `/country/${country.id}` }] : []),
        { label: region.name },
      ]"
    />

    <RegionOverview
      :region="region"
      :country-name="country?.name ?? 'Unknown country'"
      :appellation-count="regionAppellations.length"
      :region-appellations="regionAppellations"
      @select-appellation="navigateToAppellation"
    />

    <VintageRatingsTable v-if="vintageSources.length" :data="vintageSources" class="mt-8" />
  </div>
</template>
