<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import FigureRail from '@/components/editorial/FigureRail.vue'
import { Badge } from '@/components/ui/badge'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { countryContent } from '@/content/countries'
import { regionBlurb } from '@/content/regions'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import type { WineMapAreaDto } from '@/types/wineMaps'

const props = defineProps<{
  /** What the map area points at; null when nobody has linked it yet. */
  target: WineMapAreaDto['target']
  /** Heading for an area whose entry is missing or not loaded. */
  name: string
}>()

/** How many child entries the panel names before sending the reader to the full page. */
const PREVIEW_COUNT = 6

const { appellations } = storeToRefs(useWineAppellationsStore())
const { regions } = storeToRefs(useWineRegionsStore())
const { countries } = storeToRefs(useWineCountriesStore())
const { holdingForAppellation, holdingForRegion, holdingForCountry } = useCellarHoldings()

function pick<T extends { id: string }>(list: T[], type: NonNullable<typeof props.target>['type']) {
  return props.target?.type === type
    ? (list.find((item) => item.id === props.target?.id) ?? null)
    : null
}

const appellation = computed(() => pick(appellations.value, 'appellation'))
const region = computed(() => pick(regions.value, 'region'))
const country = computed(() => pick(countries.value, 'country'))

const countryName = (countryId: string | null | undefined) =>
  countries.value.find((c) => c.id === countryId)?.name ?? null

/* ----------------------------- appellation ----------------------------- */

const appellationRegionName = computed(() => {
  const a = appellation.value
  if (!a) return null
  return a.region?.name ?? regions.value.find((r) => r.id === a.region_id)?.name ?? null
})

const appellationMeta = computed(() =>
  [
    appellation.value?.classification,
    appellation.value?.established_year
      ? `Established ${appellation.value.established_year}`
      : null,
  ]
    .filter(Boolean)
    .join(' · '),
)

const appellationSummary = computed(
  () => appellation.value?.short_description ?? appellation.value?.description ?? null,
)

const appellationFacts = computed(() => {
  const a = appellation.value
  if (!a) return []
  return [
    { label: 'Styles', badges: (a.wine_styles ?? []).map(wineStyleLabel), text: null },
    { label: 'Signature grapes', badges: a.signature_grapes ?? [], text: null },
    { label: 'Drinking window', badges: [], text: a.drinking_window },
    { label: 'Climate & soil', badges: [], text: a.climate_soil, clamp: true },
  ].filter((row) => row.badges.length || row.text)
})

/* ----------------------------- region & country ----------------------------- */

const regionAppellations = computed(() =>
  region.value ? appellations.value.filter((a) => a.region_id === region.value?.id) : [],
)

const countryRegions = computed(() =>
  country.value ? regions.value.filter((r) => r.country_id === country.value?.id) : [],
)

const countryAppellationCount = computed(() => {
  const ids = new Set(countryRegions.value.map((r) => r.id))
  return appellations.value.filter((a) => ids.has(a.region_id)).length
})

/** The entries a region or country panel names, with how many were left out. */
const listing = computed(() => {
  if (region.value) {
    return {
      heading: 'Appellations',
      items: regionAppellations.value.slice(0, PREVIEW_COUNT).map((a) => ({
        id: a.id,
        name: a.name,
        to: `/appellation/${a.id}`,
        meta: '',
      })),
      more: Math.max(0, regionAppellations.value.length - PREVIEW_COUNT),
    }
  }
  if (country.value) {
    return {
      heading: 'Regions',
      items: countryRegions.value.slice(0, PREVIEW_COUNT).map((r) => ({
        id: r.id,
        name: r.name,
        to: `/region/${r.id}`,
        meta: `${appellations.value.filter((a) => a.region_id === r.id).length} appellations`,
      })),
      more: Math.max(0, countryRegions.value.length - PREVIEW_COUNT),
    }
  }
  return null
})

const figures = computed(() => {
  if (appellation.value) {
    const held = holdingForAppellation(appellation.value.id)
    return [
      { label: 'Labels held', value: held.labels },
      { label: 'Bottles', value: held.bottles },
    ]
  }
  if (region.value) {
    const held = holdingForRegion(region.value.id)
    return [
      { label: 'Appellations', value: regionAppellations.value.length },
      { label: 'Labels held', value: held.labels },
      { label: 'Bottles', value: held.bottles },
    ]
  }
  if (country.value) {
    const held = holdingForCountry(country.value.id)
    return [
      { label: 'Regions', value: countryRegions.value.length },
      { label: 'Appellations', value: countryAppellationCount.value },
      { label: 'Labels held', value: held.labels },
      { label: 'Bottles', value: held.bottles },
    ]
  }
  return []
})

const link = computed(() => {
  if (appellation.value) {
    return { to: `/appellation/${appellation.value.id}`, label: 'Full appellation profile' }
  }
  if (region.value) return { to: `/region/${region.value.id}`, label: 'Region overview' }
  if (country.value) return { to: `/country/${country.value.id}`, label: 'Country profile' }
  return null
})

const kicker = computed(() => {
  if (appellation.value) {
    return ['Appellation', appellationRegionName.value].filter(Boolean).join(' · ')
  }
  if (region.value)
    return ['Region', countryName(region.value.country_id)].filter(Boolean).join(' · ')
  if (country.value) return 'Country'
  return 'Area'
})

const title = computed(
  () => appellation.value?.name ?? region.value?.name ?? country.value?.name ?? props.name,
)

const blurb = computed(() => {
  if (appellation.value) return appellationSummary.value
  if (region.value) return regionBlurb(region.value.name)
  if (country.value) return countryContent(country.value.name)?.blurb ?? null
  return null
})

const missingNote = computed(() =>
  props.target
    ? 'Details for this area are not catalogued yet.'
    : 'This area is not linked to a catalogue entry yet.',
)
</script>

<template>
  <article>
    <p class="text-[11px] uppercase tracking-[0.18em] text-accent-700">{{ kicker }}</p>
    <h3 class="mt-1 font-heading text-[34px] font-normal leading-[1.05]">{{ title }}</h3>

    <p v-if="appellation?.pronunciation" class="mt-1 text-sm italic text-foreground/[0.58]">
      {{ appellation.pronunciation }}
    </p>
    <p
      v-if="appellationMeta"
      class="mt-2 text-[11px] uppercase tracking-[0.12em] text-foreground/[0.52]"
    >
      {{ appellationMeta }}
    </p>

    <p
      v-if="blurb"
      class="mt-4 text-sm leading-[1.7] text-foreground/80"
      :class="{ 'line-clamp-5': country }"
    >
      {{ blurb }}
    </p>
    <p v-if="!appellation && !region && !country" class="mt-4 text-sm text-foreground/[0.55]">
      {{ missingNote }}
    </p>

    <dl v-if="appellationFacts.length" class="m-0 mt-4 border-b border-border">
      <div
        v-for="row in appellationFacts"
        :key="row.label"
        class="grid grid-cols-[120px_1fr] items-baseline gap-3 border-t border-border py-2.5 max-sm:grid-cols-1 max-sm:gap-1"
      >
        <dt class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          {{ row.label }}
        </dt>
        <dd class="m-0 text-sm leading-[1.6] text-foreground/80">
          <span v-if="row.badges.length" class="flex flex-wrap gap-1.5">
            <Badge v-for="badge in row.badges" :key="badge" variant="outline">{{ badge }}</Badge>
          </span>
          <span v-else :class="{ 'line-clamp-3': row.clamp }">{{ row.text }}</span>
        </dd>
      </div>
    </dl>

    <div v-if="listing?.items.length" class="mt-5">
      <h4 class="text-[10px] font-normal uppercase tracking-[0.12em] text-foreground/[0.52]">
        {{ listing.heading }}
      </h4>
      <ul class="m-0 mt-1 list-none border-t border-border p-0">
        <li v-for="item in listing.items" :key="item.id" class="border-b border-border">
          <RouterLink
            :to="item.to"
            class="group flex items-baseline justify-between gap-3 py-1.5 font-heading text-[19px] transition-colors hover:text-accent-700"
          >
            <span>{{ item.name }}</span>
            <span v-if="item.meta" class="num font-body text-xs text-foreground/[0.55]">
              {{ item.meta }}
            </span>
          </RouterLink>
        </li>
      </ul>
      <p v-if="listing.more" class="mt-1.5 text-xs text-foreground/[0.55]">
        and {{ listing.more }} more on the full page.
      </p>
    </div>

    <div v-if="figures.length" class="mt-5">
      <FigureRail :figures="figures" orientation="horizontal" />
    </div>

    <RouterLink
      v-if="link"
      :to="link.to"
      class="mt-5 inline-block text-sm text-accent-700 underline-offset-4 transition-colors hover:text-accent-800 hover:underline"
    >
      {{ link.label }} →
    </RouterLink>
  </article>
</template>
