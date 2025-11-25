<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { MapPin } from 'lucide-vue-next'

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

import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

defineOptions({
  name: 'RegionsPage',
})

const router = useRouter()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const wineAppellationsStore = useWineAppellationsStore()

const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { appellations } = storeToRefs(wineAppellationsStore)

const searchQuery = ref('')
const selectedCountryId = ref<'all' | string>('all')

const regionsWithCounts = computed(() => {
  return regions.value.map((region) => {
    const appellationCount = appellations.value.filter((a) => a.region_id === region.id).length
    const countryName =
      region.country?.name ??
      countries.value.find((country) => country.id === region.country_id)?.name ??
      'Unknown country'

    return {
      ...region,
      countryName,
      appellationCount,
    }
  })
})

const filteredRegions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return regionsWithCounts.value.filter((region) => {
    const matchesCountry =
      selectedCountryId.value === 'all' || region.country_id === selectedCountryId.value
    const matchesQuery = !query || region.name.toLowerCase().includes(query)
    return matchesCountry && matchesQuery
  })
})

onMounted(async () => {
  await Promise.all([
    wineRegionsStore.loadAll(),
    wineCountriesStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})

function navigateToRegion(id: string) {
  router.push(`/region/${id}`)
}
</script>

<template>
  <div class="min-h-screen">
    <div class="container">
      <div class="mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <MapPin class="h-4 w-4 text-primary" />
          <span class="text-sm font-medium text-primary">Wine Regions</span>
        </div>
        <h1 class="mb-4 font-serif text-5xl font-bold text-foreground">Explore Wine Regions</h1>
        <p class="max-w-3xl text-lg text-muted-foreground">
          Browse the world's wine regions, filter by country, and drill down into appellations that
          define each locale.
        </p>
      </div>

      <div class="mb-10 grid gap-4 rounded-xl border border-border bg-card/40 p-4 md:grid-cols-3">
        <div class="md:col-span-2">
          <Label class="text-sm font-medium text-muted-foreground">Search regions</Label>
          <Input
            v-model="searchQuery"
            placeholder="Search by region name..."
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
      </div>

      <div
        v-if="filteredRegions.length === 0"
        class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground"
      >
        No regions match your filters yet.
      </div>

      <div v-else class="grid grid-cols-2 gap-8">
        <Card
          v-for="region in filteredRegions"
          :key="region.id"
          class="group cursor-pointer overflow-hidden border-border bg-card p-0 transition-all hover:shadow-lg"
          @click="navigateToRegion(region.id)"
        >
          <div class="h-44 w-full overflow-hidden">
            <img
              v-if="region.image_url"
              :src="region.image_url"
              :alt="region.name + ' landscape'"
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
            <div class="mb-4">
              <p class="text-sm uppercase tracking-wide text-muted-foreground">
                {{ region.countryName }}
              </p>
              <h2
                class="font-serif text-4xl font-semibold text-card-foreground transition-colors group-hover:text-primary"
              >
                {{ region.name }}
              </h2>
            </div>

            <div class="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span class="font-semibold text-foreground">{{ region.appellationCount }}</span>
                appellations
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
