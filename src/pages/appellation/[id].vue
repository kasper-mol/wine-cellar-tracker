<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ArrowLeft } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useGrapeAppellationsStore } from '@/stores/grapeAppellations'
import AppellationOverview from '@/components/WineAppellations/AppellationOverview.vue'
import AppellationDetailSections from '@/components/WineAppellations/AppellationDetailSections.vue'
import { getVintageRatingsBySourceForTarget } from '@/services/vintageRatings'

import VintageRatingsTable from '@/components/vintageRatings/VintageRatingsTable.vue'

import type { VintageRatingsBySource } from '@/services/vintageRatings'

defineOptions({
  name: 'AppellationDetailPage',
})

const route = useRoute()
const router = useRouter()
const wineAppellationsStore = useWineAppellationsStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const grapeAppellationsStore = useGrapeAppellationsStore()

const { appellations } = storeToRefs(wineAppellationsStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { loading: grapeRulesLoadingMap } = storeToRefs(grapeAppellationsStore)

const appellationId = route.params.id as string
const vintageSources = ref<VintageRatingsBySource[]>([])

const appellation = computed(() => appellations.value.find((a) => a.id === appellationId))
const grapeRules = computed(() => grapeAppellationsStore.rulesForAppellation(appellationId))
const grapeRulesLoading = computed(() => grapeRulesLoadingMap.value[appellationId] ?? false)
const appellationDescription = computed(() => appellation.value?.description ?? null)

const region = computed(() => {
  if (!appellation.value) return null
  const regionId = appellation.value.region_id
  return regions.value.find((r) => r.id === regionId)
})

const countryName = computed(() => {
  const regionValue = region.value
  if (!regionValue) return 'Unknown country'
  return (
    regionValue.country?.name ??
    countries.value.find((c) => c.id === regionValue.country_id)?.name ??
    'Unknown country'
  )
})

const grapeCount = computed(() => grapeRules.value.length)

onMounted(async () => {
  await Promise.all([
    wineAppellationsStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
    grapeAppellationsStore.fetchForAppellation(appellationId),
  ])

  const currentAppellation = appellation.value
  if (!currentAppellation) return

  const data = await getVintageRatingsBySourceForTarget({
    appellation_id: currentAppellation.id,
    region_id: currentAppellation.region_id,
  })

  vintageSources.value = data
})
</script>

<template>
  <div v-if="!appellation" class="container">
    <p class="text-muted-foreground">Appellation not found.</p>
  </div>

  <div v-else class="min-h-screen">
    <div class="container max-w-6xl space-y-12">
      <Button
        v-if="region"
        variant="ghost"
        class="mb-4"
        @click="router.push(`/region/${appellation.region_id}`)"
      >
        <ArrowLeft class="mr-2 h-4 w-4" />
        Back to {{ region.name }}
      </Button>

      <AppellationOverview
        :name="appellation.name"
        :image-url="appellation.image_url || null"
        :region-name="region?.name ?? 'Unknown region'"
        :country-name="countryName"
        :grape-count="grapeCount"
      />

      <AppellationDetailSections
        :description="appellationDescription"
        :grape-rules="grapeRules"
        :grape-rules-loading="grapeRulesLoading"
        :appellation-name="appellation.name"
      />
      <section v-if="vintageSources.length" class="mt-8 space-y-4">
        <VintageRatingsTable
          :data="vintageSources"
          title="Vintage ratings"
        />
      </section>
    </div>
  </div>
</template>
