<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import RegionOverview from '@/components/WineRegions/RegionOverview.vue'
import RegionAppellationsList from '@/components/WineRegions/RegionAppellationsList.vue'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import VintageRatingsTable from '@/components/vintageRatings/VintageRatingsTable.vue'
import { getVintageRatingsBySourceForTarget, type VintageRatingsBySource } from '@/services/vintageRatings'

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
  <div v-if="!region" class="container py-12">
    <p class="text-muted-foreground">Region not found.</p>
  </div>

  <div v-else class="min-h-screen">
    <div class="container max-w-6xl space-y-12">
      <Button
        v-if="country"
        variant="ghost"
        class="mb-4"
        @click="router.push(`/country/${region.country_id}`)"
      >
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to {{ country.name }}
      </Button>

      <RegionOverview
        :region="region"
        :country-name="country?.name ?? 'Unknown country'"
        :appellation-count="regionAppellations.length"
      />

      <section v-if="vintageSources.length" class="mt-8 space-y-4">
        <VintageRatingsTable :data="vintageSources" title="Vintage ratings" />
      </section>

      <RegionAppellationsList
        :appellations="regionAppellations"
        @select-appellation="navigateToAppellation"
      />
    </div>
  </div>
</template>
