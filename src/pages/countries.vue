<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FigureRail from '@/components/editorial/FigureRail.vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import { countryContent } from '@/content/countries'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { numberToWordsCapitalized } from '@/lib/numberToWords'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'

defineOptions({
  name: 'CountriesPage',
})

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)
const { holdingForCountry } = useCellarHoldings()

const entries = computed(() =>
  countries.value.map((country) => {
    const countryRegions = regions.value.filter((region) => region.country_id === country.id)
    const regionIds = new Set(countryRegions.map((region) => region.id))
    const appellationCount = appellations.value.filter(
      (appellation) =>
        appellation.region?.country_id === country.id || regionIds.has(appellation.region_id),
    ).length
    const content = countryContent(country.name)

    return {
      ...country,
      content,
      figures: [
        { label: 'Regions', value: countryRegions.length },
        { label: 'Appellations', value: appellationCount },
        { label: 'Labels held', value: holdingForCountry(country.id).labels },
      ],
    }
  }),
)

const lede = computed(() => {
  const tail =
    'regions, their protected designations, and the grapes permitted within each. Every bottle ' +
    'in the cellar is traced back to an entry here.'
  if (!countries.value.length) return `The producing countries are catalogued in full: their ${tail}`
  return (
    `${numberToWordsCapitalized(countries.value.length)} producing ` +
    `${countries.value.length === 1 ? 'country is' : 'countries are'} catalogued in full: their ` +
    tail
  )
})

onMounted(async () => {
  await Promise.all([
    wineCountriesStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})
</script>

<template>
  <div>
    <EditorialHeader
      kicker="The Encyclopedia · Book I"
      title="Countries"
      :lede="lede"
      :title-size="64"
    />
    <div class="rule-dbl mb-6 mt-6" />

    <RouterLink
      v-for="country in entries"
      :key="country.id"
      :to="{ name: 'country-detail', params: { id: country.id } }"
      class="group grid grid-cols-[340px_1fr_200px] gap-6 border-b border-border py-6 max-lg:grid-cols-1"
    >
      <PlateFigure
        :src="country.image_url"
        :alt="`${country.name} vineyard`"
        aspect="4 / 3"
        :slot-label="country.content?.photographSlot ?? `vineyard photograph — ${country.name}`"
      />
      <div>
        <p class="num mb-1.5 text-[11px] uppercase tracking-[0.16em] text-accent-700">
          {{ country.code || '—' }}
          <template v-if="country.content"> — {{ country.content.officialName }}</template>
        </p>
        <h2
          class="mb-3 font-heading text-[46px] font-normal leading-none transition-colors group-hover:text-accent-700"
        >
          {{ country.name }}
        </h2>
        <p
          v-if="country.content"
          class="max-w-[48ch] text-justify text-sm leading-[1.7] text-foreground/75"
        >
          {{ country.content.blurb }}
        </p>
      </div>
      <FigureRail :figures="country.figures" orientation="stacked" />
    </RouterLink>

    <p v-if="!entries.length" class="border-b border-border py-3 text-sm text-foreground/[0.55]">
      No countries catalogued yet.
    </p>
  </div>
</template>
