<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import { Input } from '@/components/ui/input'
import { Seg, SegOption } from '@/components/ui/seg'
import { regionBlurb } from '@/content/regions'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { numberToWordsCapitalized } from '@/lib/numberToWords'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'

defineOptions({
  name: 'RegionsPage',
})

const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const wineAppellationsStore = useWineAppellationsStore()

const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { appellations } = storeToRefs(wineAppellationsStore)
const { holdingForRegion, holdingLabel } = useCellarHoldings()

const searchQuery = ref('')
const selectedCountryId = ref<'all' | string>('all')

const regionsWithCounts = computed(() =>
  regions.value.map((region) => {
    const countryName =
      region.country?.name ??
      countries.value.find((country) => country.id === region.country_id)?.name ??
      'Unknown country'

    return {
      ...region,
      countryName,
      blurb: regionBlurb(region.name),
      appellationCount: appellations.value.filter((a) => a.region_id === region.id).length,
      holding: holdingLabel(holdingForRegion(region.id)),
    }
  }),
)

const filteredRegions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return regionsWithCounts.value.filter((region) => {
    const matchesCountry =
      selectedCountryId.value === 'all' || region.country_id === selectedCountryId.value
    const matchesQuery = !query || region.name.toLowerCase().includes(query)
    return matchesCountry && matchesQuery
  })
})

const lede = computed(() => {
  const byCountry = countries.value
    .map((country) => {
      const count = regions.value.filter((region) => region.country_id === country.id).length
      return count ? `${count} ${country.name}` : null
    })
    .filter((part): part is string => part !== null)

  const tail = 'Bottles held from a region are marked in the outer column.'
  if (!regions.value.length) return `Regions are catalogued by country. ${tail}`
  return (
    `${numberToWordsCapitalized(regions.value.length)} regions` +
    (byCountry.length ? ` — ${byCountry.join(', ')}` : '') +
    `. ${tail}`
  )
})

onMounted(async () => {
  await Promise.all([
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})
</script>

<template>
  <div>
    <EditorialHeader
      kicker="The Encyclopedia · Book II"
      title="Regions"
      :lede="lede"
      :title-size="64"
    >
      <template #controls>
        <div class="flex items-end gap-2">
          <div>
            <p class="mb-1.5 text-xs text-foreground/70">Search</p>
            <Input
              v-model="searchQuery"
              type="search"
              placeholder="Region name…"
              class="w-[230px]"
              aria-label="Search regions"
            />
          </div>
          <div>
            <p class="mb-1.5 text-xs text-foreground/70">Country</p>
            <Seg v-model="selectedCountryId" name="region-country">
              <SegOption value="all">All</SegOption>
              <SegOption v-for="country in countries" :key="country.id" :value="country.id">
                {{ country.name }}
              </SegOption>
            </Seg>
          </div>
        </div>
      </template>
    </EditorialHeader>
    <div class="rule-dbl mb-6 mt-6" />

    <div v-if="filteredRegions.length" class="grid grid-cols-3 gap-6 max-lg:grid-cols-2">
      <RouterLink
        v-for="region in filteredRegions"
        :key="region.id"
        :to="{ name: 'region-detail', params: { id: region.id } }"
        class="group flex flex-col gap-2"
      >
        <PlateFigure
          :src="region.image_url"
          :alt="`${region.name} landscape`"
          aspect="16 / 10"
          :slot-label="`landscape — ${region.name}`"
        />
        <p class="mt-1 text-[10px] uppercase tracking-[0.14em] text-accent-700">
          {{ region.countryName }}
        </p>
        <h2
          class="font-heading text-[30px] font-normal leading-[1.05] transition-colors group-hover:text-accent-700"
        >
          {{ region.name }}
        </h2>
        <p
          v-if="region.blurb"
          class="text-justify text-[13px] leading-[1.65] text-foreground/[0.72]"
        >
          {{ region.blurb }}
        </p>
        <p class="num mt-auto border-t border-border pt-2 text-xs text-foreground/[0.55]">
          {{ region.appellationCount }} appellations &nbsp;·&nbsp; {{ region.holding }}
        </p>
      </RouterLink>
    </div>

    <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No regions match these filters.
    </p>
  </div>
</template>
