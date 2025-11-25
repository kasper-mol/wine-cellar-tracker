<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Map } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

defineOptions({
  name: 'CountriesPage',
})

const router = useRouter()
const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)

// Compute counts for each country
const countriesWithCounts = computed(() => {
  return countries.value.map((country) => {
    const countryRegions = regions.value.filter((r) => r.country_id === country.id)
    const countryAppellations = appellations.value.filter(
      (a) => a.region?.country_id === country.id,
    )

    return {
      ...country,
      regionCount: countryRegions.length,
      appellationCount: countryAppellations.length,
    }
  })
})

onMounted(async () => {
  await Promise.all([
    wineCountriesStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})

function navigateToCountry(id: string) {
  router.push(`/country/${id}`)
}
</script>

<template>
  <div class="min-h-screen">
    <div class="container">
      <div class="mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Map class="h-4 w-4 text-primary" />
          <span class="text-sm font-medium text-primary">Wine Countries</span>
        </div>
        <h1 class="mb-4 font-serif text-5xl font-bold text-foreground">Wine Producing Countries</h1>
        <p class="max-w-3xl text-lg text-muted-foreground">
          Explore wine-producing countries and dive into their regions, appellations, and wine
          classifications.
        </p>
      </div>

      <div class="grid gap-8">
        <Card
          v-for="country in countriesWithCounts"
          :key="country.id"
          class="group flex cursor-pointer flex-col overflow-hidden border-border bg-card p-0 transition-all hover:shadow-lg md:flex-row"
          @click="navigateToCountry(country.id)"
        >
          <div class="h-48 w-full overflow-hidden md:h-auto md:w-64">
            <img
              v-if="country.image_url"
              :src="country.image_url"
              :alt="country.name + ' landscape'"
              class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-muted text-sm uppercase tracking-widest text-muted-foreground"
            >
              No Image
            </div>
          </div>
          <div class="flex-1 p-6 md:p-8">
            <div class="mb-4 flex items-start justify-between">
              <div>
                <h2
                  class="mb-3 font-serif text-4xl font-semibold text-card-foreground transition-colors group-hover:text-primary"
                >
                  {{ country.name }}
                </h2>
                <p v-if="country.code" class="max-w-3xl text-lg text-muted-foreground">
                  Country code: {{ country.code }}
                </p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Map class="h-6 w-6 text-primary" />
              </div>
            </div>

            <div class="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
              <div>
                <span class="font-semibold text-foreground">{{ country.regionCount }}</span>
                regions
              </div>
              <div>
                <span class="font-semibold text-foreground">{{ country.appellationCount }}</span>
                appellations
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>
