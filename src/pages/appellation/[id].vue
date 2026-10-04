<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import Breadcrumb from '@/components/editorial/Breadcrumb.vue'
import AppellationCopySection from '@/components/WineAppellations/AppellationCopySection.vue'
import AppellationFlavorSection from '@/components/WineAppellations/AppellationFlavorSection.vue'
import AppellationFoodPairingSection from '@/components/WineAppellations/AppellationFoodPairingSection.vue'
import AppellationOverview from '@/components/WineAppellations/AppellationOverview.vue'
import AppellationStyleFacts from '@/components/WineAppellations/AppellationStyleFacts.vue'
import VintageRatingsTable from '@/components/vintageRatings/VintageRatingsTable.vue'
import { Seg, SegOption } from '@/components/ui/seg'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { flavorRowsForPage, isMultiStyle } from '@/lib/appellationStyleView'
import { formatWindow } from '@/lib/cellar'
import { toAppellationStyle, wineStyleLabel } from '@/lib/wineStyles'
import { useAppellationFlavorsStore } from '@/stores/appellationFlavors'
import { useAppellationStyleProfilesStore } from '@/stores/appellationStyleProfiles'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import { useGrapeAppellationsStore } from '@/stores/grapeAppellations'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { getVintageRatingsBySourceForTarget } from '@/services/vintageRatings'
import type { VintageRatingsBySource } from '@/types/vintageRatings'
import type { WineStyle } from '@/types/wineAppellations'

defineOptions({
  name: 'AppellationDetailPage',
})

const route = useRoute()
const router = useRouter()
const wineAppellationsStore = useWineAppellationsStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const grapeAppellationsStore = useGrapeAppellationsStore()
const drinkingWindowStore = useDrinkingWindowStore()
const appellationFlavorsStore = useAppellationFlavorsStore()
const flavorDescriptorsStore = useFlavorDescriptorsStore()
const foodPairingsStore = useFoodPairingsStore()
const styleProfilesStore = useAppellationStyleProfilesStore()

const { appellations } = storeToRefs(wineAppellationsStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { loading: grapeRulesLoadingMap } = storeToRefs(grapeAppellationsStore)
const { loading: flavorLoadingMap } = storeToRefs(appellationFlavorsStore)
const { holdingForAppellation, winesForAppellation } = useCellarHoldings()

const appellationId = route.params.id as string
const vintageSources = ref<VintageRatingsBySource[]>([])
const configReady = ref(false)

const appellation = computed(() => appellations.value.find((a) => a.id === appellationId))
const grapeRules = computed(() => grapeAppellationsStore.rulesForAppellation(appellationId))
const flavorRows = computed(() => appellationFlavorsStore.forAppellation(appellationId))
const flavorLoading = computed(() => flavorLoadingMap.value[appellationId] ?? false)
const foodPairingOverrides = computed(() => foodPairingsStore.forAppellation(appellationId))
/** With several wine styles, each style's own classic dishes are listed under "Pairs well with"
 *  (a white and a red are different wines), so the flat list steps aside — once that section
 *  can actually render, i.e. the food vocabulary has loaded. */
const pairingsShownPerStyle = computed(
  () => foodPairingsStore.vocabularyLoaded && (appellation.value?.wine_styles?.length ?? 0) > 1,
)

/** A white and a red from one appellation are different wines: with several styles, everything
 *  style-specific sits under one style switcher. Single-style appellations have nothing to split. */
const multi = computed(() => !!appellation.value && isMultiStyle(appellation.value))
const styles = computed(() => appellation.value?.wine_styles ?? [])
const queryStyle = computed(() =>
  typeof route.query.style === 'string' ? route.query.style : null,
)
const selectedStyle = ref<WineStyle | null>(null)

watch(
  [styles, queryStyle],
  ([list, wanted]) => {
    if (!list.length) {
      selectedStyle.value = null
    } else if (wanted && (list as string[]).includes(wanted)) {
      selectedStyle.value = wanted as WineStyle
    } else if (!selectedStyle.value || !list.includes(selectedStyle.value)) {
      selectedStyle.value = list[0] ?? null
    }
  },
  { immediate: true },
)

/** Kept in the URL so a link to "the white" is shareable and survives a refresh. */
function chooseStyle(value: string) {
  selectedStyle.value = value as WineStyle
  void router.replace({ query: { ...route.query, style: value } })
}

const activeProfile = computed(() =>
  selectedStyle.value
    ? styleProfilesStore.profileFor(appellationId, selectedStyle.value)
    : undefined,
)
const flavorRowsShown = computed(() =>
  flavorRowsForPage(flavorRows.value, appellation.value?.wine_styles, selectedStyle.value),
)

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

/** Bottles of the selected style. A bottle whose style isn't recorded can't be placed, so it shows
 *  under every style (marked) rather than being called a red. */
const cellarEntriesShown = computed(() => {
  const style = multi.value ? selectedStyle.value : null
  return cellarEntries.value.filter(
    ({ wine }) => !style || !wine.styleKnown || toAppellationStyle(wine.style) === style,
  )
})

onMounted(async () => {
  await Promise.all([
    wineAppellationsStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
    grapeAppellationsStore.fetchForAppellation(appellationId),
    appellationFlavorsStore.fetchForAppellation(appellationId),
    flavorDescriptorsStore.loadAll(),
    // Optional extras: a failure here must not stop the rest of the page from loading.
    foodPairingsStore.fetchForAppellation(appellationId).catch(() => undefined),
    styleProfilesStore.fetchForAppellation(appellationId).catch(() => undefined),
    foodPairingsStore.loadVocabulary().catch(() => undefined),
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
      :pronunciation="appellation.pronunciation"
      :classification="appellation.classification"
      :established-year="appellation.established_year"
      :labels-held="holding.labels"
      :bottles-held="holding.bottles"
    />

    <AppellationCopySection
      :signature-grapes="appellation.signature_grapes"
      :wine-styles="appellation.wine_styles"
      :style-summary="appellation.style_summary"
      :climate-soil="appellation.climate_soil"
      :drinking-window="appellation.drinking_window"
      :food-pairings="pairingsShownPerStyle ? null : appellation.food_pairings"
      :fun-fact="appellation.fun_fact"
      :split-by-style="multi"
    />

    <section v-if="multi && selectedStyle" class="mt-8" aria-label="By wine style">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3">
        <span class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          Wine style
        </span>
        <Seg
          :model-value="selectedStyle"
          name="appellation-style"
          @update:model-value="chooseStyle"
        >
          <SegOption v-for="style in styles" :key="style" :value="style">
            {{ wineStyleLabel(style) }}
          </SegOption>
        </Seg>
      </div>
      <AppellationStyleFacts
        :appellation="appellation"
        :style="selectedStyle"
        :profile="activeProfile"
      />
    </section>

    <AppellationFoodPairingSection
      :appellation="appellation"
      :overrides="foodPairingOverrides"
      :preferred-style="multi ? null : queryStyle"
      :only-style="multi ? selectedStyle : null"
    />

    <AppellationFlavorSection :rows="flavorRowsShown" :loading="flavorLoading" />

    <!-- Temporary removal of GrapeCompositionSection -->
    <!-- <GrapeCompositionSection
      :rules="grapeRules"
      :loading="grapeRulesLoading"
      :appellation-name="appellation.name"
    /> -->

    <section v-if="cellarEntriesShown.length">
      <h2 class="mb-3 mt-8 font-heading text-[30px] font-normal">
        In your cellar<template v-if="multi && selectedStyle">
          · {{ wineStyleLabel(selectedStyle) }}</template
        >
      </h2>
      <div class="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <article
          v-for="entry in cellarEntriesShown"
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
          <p
            v-if="multi && !entry.wine.styleKnown"
            class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.45]"
          >
            Style not set
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
