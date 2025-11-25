<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Wine } from 'lucide-vue-next'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'

defineOptions({
  name: 'AppellationsPage',
})

const router = useRouter()
const wineAppellationsStore = useWineAppellationsStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()

const { appellations } = storeToRefs(wineAppellationsStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)

const searchQuery = ref('')
const selectedCountryId = ref<'all' | string>('all')
const selectedRegionId = ref<'all' | string>('all')

const regionsForFilter = computed(() => {
  if (selectedCountryId.value === 'all') return regions.value
  return regions.value.filter((region) => region.country_id === selectedCountryId.value)
})

const appellationsWithMeta = computed(() => {
  return appellations.value.map((appellation) => {
    const region =
      appellation.region ??
      regions.value.find((regionRecord) => regionRecord.id === appellation.region_id) ??
      null
    const country =
      region?.country ??
      countries.value.find((countryRecord) => countryRecord.id === region?.country_id) ??
      null

    return {
      ...appellation,
      regionName: region?.name ?? 'Unknown region',
      countryName: country?.name ?? 'Unknown country',
      countryId: country?.id ?? region?.country_id ?? null,
      grapeCount: appellation.grapes?.length ?? 0,
    }
  })
})

const filteredAppellations = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return appellationsWithMeta.value.filter((appellation) => {
    const matchesCountry =
      selectedCountryId.value === 'all' ||
      (!appellation.countryId ? false : appellation.countryId === selectedCountryId.value)
    const matchesRegion =
      selectedRegionId.value === 'all' || appellation.region_id === selectedRegionId.value
    const matchesQuery =
      !query ||
      appellation.name.toLowerCase().includes(query) ||
      appellation.regionName.toLowerCase().includes(query) ||
      appellation.countryName.toLowerCase().includes(query)

    return matchesCountry && matchesRegion && matchesQuery
  })
})

watch(selectedCountryId, () => {
  selectedRegionId.value = 'all'
})

onMounted(async () => {
  await Promise.all([
    wineAppellationsStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
  ])
})

function navigateToAppellation(id: string) {
  router.push(`/appellation/${id}`)
}
</script>

<template>
  <div class="min-h-screen">
    <div class="container">
      <div class="mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Wine class="h-4 w-4 text-primary" />
          <span class="text-sm font-medium text-primary">Wine Appellations</span>
        </div>
        <h1 class="mb-4 font-serif text-5xl font-bold text-foreground">Discover Appellations</h1>
        <p class="max-w-3xl text-lg text-muted-foreground">
          Search the catalog of wine appellations, filter them by country and region, and open any
          entry to see grape rules, descriptions, and related wines.
        </p>
      </div>

      <div class="mb-10 grid gap-4 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-3">
        <div class="md:col-span-2">
          <Label class="text-sm font-medium text-muted-foreground">Search appellations</Label>
          <Input
            v-model="searchQuery"
            placeholder="Search by appellation, region, or country..."
            class="mt-2"
            type="search"
          />
        </div>
        <div>
          <Label class="text-sm font-medium text-muted-foreground">Filter by country</Label>
          <Select v-model="selectedCountryId">
            <SelectTrigger class="mt-2 w-full">
              <SelectValue placeholder="All countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All countries</SelectItem>
              <SelectItem v-for="country in countries" :key="country.id" :value="country.id">
                {{ country.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label class="text-sm font-medium text-muted-foreground">Filter by region</Label>
          <Select v-model="selectedRegionId">
            <SelectTrigger class="mt-2 w-full">
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

      <div
        v-if="filteredAppellations.length === 0"
        class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground"
      >
        No appellations match your filters yet.
      </div>

      <div v-else class="grid gap-8">
        <Card
          v-for="appellation in filteredAppellations"
          :key="appellation.id"
          class="group cursor-pointer overflow-hidden border-border bg-card p-0 transition-all hover:shadow-lg"
          @click="navigateToAppellation(appellation.id)"
        >
          <div class="h-44 w-full overflow-hidden">
            <img
              v-if="appellation.image_url"
              :src="appellation.image_url"
              :alt="appellation.name + ' vineyards'"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-muted text-xs uppercase tracking-widest text-muted-foreground"
            >
              No Image
            </div>
          </div>
          <div class="p-8">
            <div class="mb-4 flex items-start justify-between">
              <div>
                <p class="text-sm uppercase tracking-wide text-muted-foreground">
                  {{ appellation.countryName }} • {{ appellation.regionName }}
                </p>
                <h2
                  class="font-serif text-4xl font-semibold text-card-foreground transition-colors group-hover:text-primary"
                >
                  {{ appellation.name }}
                </h2>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wine class="h-6 w-6 text-primary" />
              </div>
            </div>

            <div class="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span class="font-semibold text-foreground">{{ appellation.grapeCount }}</span>
                grape rules
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
