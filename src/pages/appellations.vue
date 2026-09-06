<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { refDebounced } from '@vueuse/core'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Seg, SegOption } from '@/components/ui/seg'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCellarHoldings } from '@/composables/useCellarHoldings'
import { numberToWordsCapitalized } from '@/lib/numberToWords'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'

defineOptions({
  name: 'AppellationsPage',
})

/** 654 rows of font-heading text reflow badly in one paint — grow the index. */
const PAGE_SIZE = 120

const wineAppellationsStore = useWineAppellationsStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()

const { appellations } = storeToRefs(wineAppellationsStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { heldAppellationIds } = useCellarHoldings()

const searchQuery = ref('')
const debouncedQuery = refDebounced(searchQuery, 150)
const selectedCountryId = ref<'all' | string>('all')
const selectedRegionId = ref<'all' | string>('all')
const visibleCount = ref(PAGE_SIZE)

const regionsForFilter = computed(() => {
  if (selectedCountryId.value === 'all') return regions.value
  return regions.value.filter((region) => region.country_id === selectedCountryId.value)
})

const appellationsWithMeta = computed(() =>
  appellations.value.map((appellation) => {
    const region =
      appellation.region ??
      regions.value.find((regionRecord) => regionRecord.id === appellation.region_id) ??
      null
    const country =
      region?.country ??
      countries.value.find((countryRecord) => countryRecord.id === region?.country_id) ??
      null

    return {
      id: appellation.id,
      name: appellation.name,
      regionId: appellation.region_id,
      regionName: region?.name ?? 'Unknown region',
      countryName: country?.name ?? 'Unknown country',
      countryId: country?.id ?? region?.country_id ?? null,
      grapeCount: appellation.grapes?.length ?? 0,
      shortDescription: appellation.short_description,
    }
  }),
)

const filteredAppellations = computed(() => {
  const query = debouncedQuery.value.trim().toLowerCase()

  return appellationsWithMeta.value.filter((appellation) => {
    const matchesCountry =
      selectedCountryId.value === 'all' ||
      (!appellation.countryId ? false : appellation.countryId === selectedCountryId.value)
    const matchesRegion =
      selectedRegionId.value === 'all' || appellation.regionId === selectedRegionId.value
    const matchesQuery =
      !query ||
      appellation.name.toLowerCase().includes(query) ||
      appellation.regionName.toLowerCase().includes(query) ||
      appellation.countryName.toLowerCase().includes(query) ||
      (appellation.shortDescription?.toLowerCase().includes(query) ?? false)

    return matchesCountry && matchesRegion && matchesQuery
  })
})

const visibleAppellations = computed(() => filteredAppellations.value.slice(0, visibleCount.value))

const lede = computed(() => {
  const tail =
    'Names appear in their register form, including multi-synonym entries. A gold rule marks a ' +
    'designation represented in the cellar.'
  if (!appellations.value.length) {
    return `The protected designations are seeded from the official register. ${tail}`
  }
  return (
    `${numberToWordsCapitalized(appellations.value.length)} protected designations, seeded from ` +
    `the official register. ${tail}`
  )
})

watch(selectedCountryId, () => {
  selectedRegionId.value = 'all'
})

watch([debouncedQuery, selectedCountryId, selectedRegionId], () => {
  visibleCount.value = PAGE_SIZE
})

onMounted(async () => {
  await Promise.all([
    wineAppellationsStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
  ])
})
</script>

<template>
  <div>
    <EditorialHeader
      kicker="The Encyclopedia · Book III"
      title="Appellations"
      :lede="lede"
      :title-size="64"
      :lede-width="62"
    >
      <template #controls>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <p class="mb-1.5 text-xs text-foreground/70">Search</p>
            <Input
              v-model="searchQuery"
              type="search"
              placeholder="Appellation, region, country or note…"
              class="w-[280px]"
              aria-label="Search appellations"
            />
          </div>
          <div>
            <p class="mb-1.5 text-xs text-foreground/70">Country</p>
            <Seg v-model="selectedCountryId" name="appellation-country">
              <SegOption value="all">All</SegOption>
              <SegOption v-for="country in countries" :key="country.id" :value="country.id">
                {{ country.code || country.name }}
              </SegOption>
            </Seg>
          </div>
          <div>
            <p class="mb-1.5 text-xs text-foreground/70">Region</p>
            <Select v-model="selectedRegionId">
              <SelectTrigger class="w-[200px]">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                <SelectItem v-for="region in regionsForFilter" :key="region.id" :value="region.id">
                  {{ region.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </template>
    </EditorialHeader>
    <div class="rule-dbl mb-6 mt-6" />

    <div v-if="visibleAppellations.length" class="grid grid-cols-2 gap-x-8 max-md:grid-cols-1">
      <RouterLink
        v-for="appellation in visibleAppellations"
        :key="appellation.id"
        :to="{ name: 'appellation-detail', params: { id: appellation.id } }"
        class="group block border-b border-l-2 border-border px-2 py-[9px] transition-colors hover:bg-primary/5"
        :class="
          heldAppellationIds.has(appellation.id) ? 'border-l-primary' : 'border-l-transparent'
        "
      >
        <span class="grid grid-cols-[1fr_128px_58px] items-baseline gap-3">
          <span
            class="font-heading text-[18px] leading-[1.2] transition-colors group-hover:text-accent-700"
          >
            {{ appellation.name }}
          </span>
          <span class="text-xs text-foreground/[0.55]">{{ appellation.regionName }}</span>
        </span>
      </RouterLink>
    </div>

    <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No appellations match these filters.
    </p>

    <div class="mt-4 flex items-baseline gap-4">
      <p class="text-xs text-foreground/50">
        Showing {{ visibleAppellations.length }} of {{ filteredAppellations.length }}
      </p>
      <Button
        v-if="visibleAppellations.length < filteredAppellations.length"
        variant="ghost"
        size="sm"
        @click="visibleCount += PAGE_SIZE"
      >
        Show more
      </Button>
    </div>
  </div>
</template>
