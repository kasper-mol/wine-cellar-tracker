<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import FigureRail from '@/components/editorial/FigureRail.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { formatPrice, lineValue } from '@/lib/cellar'
import { numberToWords, numberToWordsCapitalized } from '@/lib/numberToWords'
import type { UserWine } from '@/types/wines'

const props = defineProps<{
  wines: UserWine[]
  /** Bottles at or past peak. */
  readyBottles: number
}>()

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)

const bottles = computed(() => props.wines.reduce((sum, wine) => sum + wine.quantity, 0))
const labels = computed(() => new Set(props.wines.map((wine) => wine.name)).size)
const value = computed(() => props.wines.reduce((sum, wine) => sum + lineValue(wine), 0))

/** Countries represented in the cellar, joined through the region records. */
const origins = computed(() => {
  const countryById = new Map(countries.value.map((country) => [country.id, country.name]))
  const regionById = new Map(regions.value.map((region) => [region.id, region]))
  const names = new Set<string>()
  for (const wine of props.wines) {
    const region = wine.regionId ? regionById.get(wine.regionId) : null
    const name = region?.country?.name ?? (region ? countryById.get(region.country_id) : null)
    if (name) names.add(name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
})

const originsPhrase = computed(() => {
  const list = origins.value
  if (!list.length) return ''
  if (list.length === 1) return `, drawn from ${list[0]}`
  return `, drawn from ${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
})

const lede = computed(
  () =>
    `${numberToWordsCapitalized(bottles.value)} bottle${bottles.value === 1 ? '' : 's'} across ` +
    `${numberToWords(labels.value)} label${labels.value === 1 ? '' : 's'}${originsPhrase.value}. ` +
    'Every entry below is measured against its drinking window — what is ready, what must wait, ' +
    'and what will not survive another winter.',
)

const figures = computed(() => [
  { label: 'Bottles', value: bottles.value },
  { label: 'Labels', value: labels.value },
  { label: 'Ready now', value: props.readyBottles },
  { label: 'Value', value: formatPrice(value.value) },
])
</script>

<template>
  <section class="grid grid-cols-[1fr_300px] items-end gap-8 pb-6 max-lg:grid-cols-1">
    <div>
      <p class="num mb-3 text-[11px] uppercase tracking-[0.18em] text-accent-700">
        Private cellar &nbsp;·&nbsp; Fascicle No. {{ labels }}
      </p>
      <h1 class="mb-3 font-heading text-[76px] font-normal leading-[0.95] tracking-[-0.02em]">
        The Cellar
      </h1>
      <p
        class="max-w-[52ch] hyphens-auto text-justify text-[15px] leading-[1.7] text-foreground/[0.78]"
      >
        {{ lede }}
      </p>
    </div>
    <FigureRail :figures="figures" orientation="vertical" />
  </section>
</template>
