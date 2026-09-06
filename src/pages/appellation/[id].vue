<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import Breadcrumb from '@/components/editorial/Breadcrumb.vue'
import AppellationOverview from '@/components/WineAppellations/AppellationOverview.vue'
import GrapeCompositionSection from '@/components/WineAppellations/GrapeCompositionSection.vue'
import VintageRatingsTable from '@/components/vintageRatings/VintageRatingsTable.vue'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { formatWindow } from '@/lib/cellar'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useGrapeAppellationsStore } from '@/stores/grapeAppellations'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { getVintageRatingsBySourceForTarget } from '@/services/vintageRatings'
import type { VintageRatingsBySource } from '@/types/vintageRatings'

defineOptions({
  name: 'AppellationDetailPage',
})

const route = useRoute()
const wineAppellationsStore = useWineAppellationsStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const grapeAppellationsStore = useGrapeAppellationsStore()
const drinkingWindowStore = useDrinkingWindowStore()

const { appellations } = storeToRefs(wineAppellationsStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { loading: grapeRulesLoadingMap } = storeToRefs(grapeAppellationsStore)
const { holdingForAppellation, winesForAppellation } = useCellarHoldings()

const appellationId = route.params.id as string
const vintageSources = ref<VintageRatingsBySource[]>([])
const configReady = ref(false)

const appellation = computed(() => appellations.value.find((a) => a.id === appellationId))
const grapeRules = computed(() => grapeAppellationsStore.rulesForAppellation(appellationId))
const grapeRulesLoading = computed(() => grapeRulesLoadingMap.value[appellationId] ?? false)

const region = computed(() => {
  if (!appellation.value) return null
  return regions.value.find((r) => r.id === appellation.value?.region_id) ?? null
})

const country = computed(() => {
  const regionValue = region.value
  if (!regionValue) return null
  return regionValue.country ?? countries.value.find((c) => c.id === regionValue.country_id) ?? null
})

const displayImage = computed(() => appellation.value?.image_url || region.value?.image_url || null)

const holding = computed(() => holdingForAppellation(appellationId))

/** The link the app was missing — the encyclopedia pointing back at the cellar. */
const cellarEntries = computed(() =>
  winesForAppellation(appellationId).map((wine) => ({
    wine,
    window: configReady.value ? drinkingWindowStore.computeWindow(wine) : null,
  })),
)

onMounted(async () => {
  await Promise.all([
    wineAppellationsStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
    grapeAppellationsStore.fetchForAppellation(appellationId),
    drinkingWindowStore.loadConfig().then(() => {
      configReady.value = true
    }),
  ])

  const currentAppellation = appellation.value
  if (!currentAppellation) return

  vintageSources.value = await getVintageRatingsBySourceForTarget({
    appellation_id: currentAppellation.id,
    region_id: currentAppellation.region_id,
  })
})
</script>

<template>
  <p v-if="!appellation" class="text-sm text-foreground/[0.55]">Appellation not found.</p>

  <div v-else>
    <Breadcrumb
      :items="[
        ...(country ? [{ label: country.name, to: `/country/${country.id}` }] : []),
        ...(region ? [{ label: region.name, to: `/region/${region.id}` }] : []),
        { label: appellation.name },
      ]"
    />

    <AppellationOverview
      :name="appellation.name"
      :image-url="displayImage"
      :region-name="region?.name ?? 'Unknown region'"
      :country-name="country?.name ?? 'Unknown country'"
      :grape-rules="grapeRules"
      :description="appellation.description"
      :labels-held="holding.labels"
      :bottles-held="holding.bottles"
    />

    <GrapeCompositionSection
      :rules="grapeRules"
      :loading="grapeRulesLoading"
      :appellation-name="appellation.name"
    />

    <section v-if="cellarEntries.length">
      <h2 class="mb-3 mt-8 font-heading text-[30px] font-normal">In your cellar</h2>
      <div class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <article
          v-for="entry in cellarEntries"
          :key="entry.wine.id"
          class="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <PhaseMark v-if="entry.window" :phase="entry.window.phaseNow" />
          <h3 class="font-heading text-[17px] font-semibold leading-[1.2]">
            {{ entry.wine.vintage || 'NV' }} {{ entry.wine.name }}
          </h3>
          <p v-if="entry.wine.producer" class="text-xs italic text-foreground/[0.58]">
            {{ entry.wine.producer }}
          </p>
          <p class="num text-[11px] text-foreground/50">
            {{ formatWindow(entry.window) }} &nbsp;·&nbsp; {{ entry.wine.quantity }} bottles
          </p>
        </article>
      </div>
    </section>

    <VintageRatingsTable v-if="vintageSources.length" :data="vintageSources" class="mt-8" />
  </div>
</template>
