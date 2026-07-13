<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'

const dwStore = useDrinkingWindowStore()
const appellationsStore = useWineAppellationsStore()
const regionsStore = useWineRegionsStore()
const { archetypes, mappings, producerTiers, hotVintages } = storeToRefs(dwStore)
const { appellations } = storeToRefs(appellationsStore)
const { regions } = storeToRefs(regionsStore)

onMounted(() => {
  dwStore.loadConfig()
  appellationsStore.loadAll()
  regionsStore.loadAll()
})

const mappedAppellations = computed(
  () => new Set(mappings.value.filter((m) => m.appellation_id).map((m) => m.appellation_id)).size,
)
const mappedRegions = computed(
  () => new Set(mappings.value.filter((m) => m.region_id).map((m) => m.region_id)).size,
)

const sections = [
  {
    name: 'Archetypes',
    to: '/manage/drinking-window/archetypes',
    description:
      'Define aging profiles. Each archetype sets how many years after vintage a wine enters its window, peaks, and fades — at a neutral 90-pt score.',
  },
  {
    name: 'Mappings',
    to: '/manage/drinking-window/mappings',
    description:
      'Link appellations and regions to archetypes. The engine uses the appellation mapping first, then region as fallback. Unmapped wines show no window.',
  },
  {
    name: 'Producer tiers',
    to: '/manage/drinking-window/producers',
    description:
      'Top producers age longer. Tier 4 extends the back-end by 5%, tier 4.5 by 8%, tier 5 by 12%. Only the top 30–40 producers per region need entries.',
  },
  {
    name: 'Hot vintages',
    to: '/manage/drinking-window/hot-vintages',
    description:
      'Flag years that matured faster than average. The engine applies compression factors to the peak and drink-by dates for matching wines.',
  },
  {
    name: 'Calibration',
    to: '/manage/drinking-window/settings',
    description:
      'Tune K-coefficients (vintage score response), scoring midpoint, premox cap, and producer extension factors. Changes apply immediately to all computed windows.',
  },
]
</script>

<template>
  <div class="space-y-8">
    <div>
      <p class="text-sm uppercase tracking-wide text-muted-foreground">Manage</p>
      <h1 class="text-3xl font-semibold tracking-tight">Drinking-window engine</h1>
      <p class="mt-1 text-muted-foreground">
        Configure the scoring tables that power computed drink windows on the dashboard. Estimates
        are vintage- and region-level — never bottle-specific.
      </p>
    </div>

    <!-- Stats -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <p class="text-sm text-muted-foreground">Archetypes</p>
        <p class="text-3xl font-semibold">{{ archetypes.length }}</p>
      </div>
      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <p class="text-sm text-muted-foreground">Appellations mapped</p>
        <p class="text-3xl font-semibold">
          {{ mappedAppellations }}
          <span class="text-lg font-normal text-muted-foreground">/ {{ appellations.length }}</span>
        </p>
      </div>
      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <p class="text-sm text-muted-foreground">Regions mapped</p>
        <p class="text-3xl font-semibold">
          {{ mappedRegions }}
          <span class="text-lg font-normal text-muted-foreground">/ {{ regions.length }}</span>
        </p>
      </div>
      <div class="rounded-xl border bg-card p-5 shadow-sm">
        <p class="text-sm text-muted-foreground">Producer tiers</p>
        <p class="text-3xl font-semibold">{{ producerTiers.length }}</p>
      </div>
    </section>

    <!-- Nav cards -->
    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="block rounded-xl border bg-card p-5 shadow-sm transition hover:bg-muted/50"
      >
        <h2 class="font-semibold">{{ s.name }}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{{ s.description }}</p>
      </RouterLink>
    </section>
  </div>
</template>
