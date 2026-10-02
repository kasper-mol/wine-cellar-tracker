<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { buildEditorialIndex } from '@/lib/foodPairingEditorial'
import { buildAppellationPairings } from '@/lib/foodPairingProfile'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { AppellationFoodPairingRecord } from '@/types/foodPairings'
import type { WineAppellationRecord } from '@/types/wineAppellations'

const props = defineProps<{
  appellation: WineAppellationRecord
  overrides: AppellationFoodPairingRecord[]
  /** A style to show first and mark — the one a pairing search pointed at. */
  preferredStyle?: string | null
  /** Show only this style (the page's style switcher is on it). Dishes no style owns still show. */
  onlyStyle?: string | null
}>()

const foodPairingsStore = useFoodPairingsStore()
const { tags, phraseIndex, wineStyleFoodPairings } = storeToRefs(foodPairingsStore)

const pairings = computed(() => {
  const dishes =
    buildEditorialIndex([props.appellation], tags.value, phraseIndex.value).get(
      props.appellation.id,
    ) ?? []
  return buildAppellationPairings(
    props.appellation.wine_styles,
    tags.value,
    wineStyleFoodPairings.value,
    props.overrides,
    dishes,
  )
})

/** The searched-for style leads; the rest keep the appellation's own order. */
const styles = computed(() => {
  const preferred = props.preferredStyle
  const shown = props.onlyStyle
    ? pairings.value.styles.filter((entry) => entry.style === props.onlyStyle)
    : pairings.value.styles
  return [...shown].sort((a, b) => Number(b.style === preferred) - Number(a.style === preferred))
})

const hasContent = computed(() => styles.value.length > 0 || pairings.value.unattributed.length > 0)
</script>

<template>
  <section v-if="hasContent" class="mt-8">
    <div
      class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2"
    >
      <h2 class="font-heading text-[30px] font-normal">Pairs well with</h2>
      <RouterLink to="/pairing" class="text-[11px] uppercase tracking-[0.12em] text-accent-700">
        Pairing search
      </RouterLink>
    </div>

    <div
      v-for="entry in styles"
      :key="entry.style"
      class="grid grid-cols-[150px_1fr] gap-4 border-b border-border py-3 max-md:grid-cols-1 max-md:gap-1.5"
    >
      <div>
        <p class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          {{ wineStyleLabel(entry.style) }}
        </p>
        <p
          v-if="entry.style === preferredStyle"
          class="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-primary"
        >
          From your search
        </p>
      </div>
      <div class="space-y-2.5">
        <p v-if="entry.dishes.length" class="text-sm leading-[1.7] text-foreground/80">
          <span class="text-foreground/[0.5]">Classic dishes: </span>
          {{ entry.dishes.join(' · ') }}
        </p>
        <div v-if="entry.tags.length" class="flex flex-wrap gap-1.5">
          <RouterLink
            v-for="item in entry.tags"
            :key="item.tag.id"
            :to="{ name: 'pairing', query: { tags: item.tag.slug } }"
            class="inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-[13px] transition-colors hover:border-foreground/40"
            :class="
              item.curated ? 'border-primary text-primary' : 'border-border text-foreground/70'
            "
            :title="item.curated ? 'Curated for this appellation' : undefined"
          >
            {{ item.tag.name }}
          </RouterLink>
        </div>
      </div>
    </div>

    <div
      v-if="pairings.unattributed.length"
      class="grid grid-cols-[150px_1fr] gap-4 border-b border-border py-3 max-md:grid-cols-1 max-md:gap-1.5"
    >
      <p class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">Any style</p>
      <p class="text-sm leading-[1.7] text-foreground/80">
        {{ pairings.unattributed.join(' · ') }}
      </p>
    </div>
  </section>
</template>
