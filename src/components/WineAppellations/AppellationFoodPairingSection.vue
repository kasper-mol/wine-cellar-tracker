<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { buildPairingProfile } from '@/lib/foodPairingProfile'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { AppellationFoodPairingRecord } from '@/types/foodPairings'
import type { WineStyle } from '@/types/wineAppellations'

const props = defineProps<{
  wineStyles: WineStyle[] | null
  overrides: AppellationFoodPairingRecord[]
}>()

const foodPairingsStore = useFoodPairingsStore()
const { tags, wineStyleFoodPairings } = storeToRefs(foodPairingsStore)

const profile = computed(() =>
  buildPairingProfile(props.wineStyles, tags.value, wineStyleFoodPairings.value, props.overrides),
)
</script>

<template>
  <section v-if="profile.length" class="mt-8">
    <div
      class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2"
    >
      <h2 class="font-heading text-[30px] font-normal">Pairs well with</h2>
      <RouterLink to="/pairing" class="text-[11px] uppercase tracking-[0.12em] text-accent-700">
        Pairing search
      </RouterLink>
    </div>

    <div
      v-for="entry in profile"
      :key="entry.style"
      class="grid grid-cols-[150px_1fr] gap-4 border-b border-border py-3 max-md:grid-cols-1"
    >
      <p class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        {{ wineStyleLabel(entry.style) }}
      </p>
      <div class="flex flex-wrap gap-1.5">
        <RouterLink
          v-for="item in entry.tags"
          :key="item.tag.id"
          :to="{ name: 'pairing', query: { tags: item.tag.slug } }"
          class="inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[13px] transition-colors hover:border-foreground/40"
          :class="item.curated ? 'border-primary text-primary' : 'border-border text-foreground/70'"
          :title="item.curated ? 'Curated for this appellation' : undefined"
        >
          {{ item.tag.name }}
        </RouterLink>
      </div>
    </div>
  </section>
</template>
