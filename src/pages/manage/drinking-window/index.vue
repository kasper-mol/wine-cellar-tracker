<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import FigureRail from '@/components/editorial/FigureRail.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
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

const figures = computed(() => [
  { label: 'Archetypes', value: archetypes.value.length },
  {
    label: 'Appellations mapped',
    value: `${mappedAppellations.value} / ${appellations.value.length}`,
  },
  { label: 'Regions mapped', value: `${mappedRegions.value} / ${regions.value.length}` },
  { label: 'Producer tiers', value: producerTiers.value.length },
])

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
  <div>
    <ManageHeader
      title="Drinking-window engine"
      note="The scoring tables behind every computed window on the dashboard. Estimates are vintage- and region-level — never bottle-specific."
    />

    <ManageTabs />

    <FigureRail :figures="figures" orientation="horizontal" class="mb-8" />

    <div class="border-t border-border">
      <RouterLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="group grid grid-cols-[220px_1fr] items-baseline gap-4 border-b border-border px-2 py-4 transition-colors hover:bg-primary/5 max-md:grid-cols-1"
      >
        <h2 class="font-heading text-[21px] transition-colors group-hover:text-accent-700">
          {{ s.name }}
        </h2>
        <p class="text-[13px] leading-[1.6] text-foreground/[0.74]">{{ s.description }}</p>
      </RouterLink>
    </div>

    <p class="mt-4 text-xs text-foreground/50">Hot vintages: {{ hotVintages.length }} flagged.</p>
  </div>
</template>
