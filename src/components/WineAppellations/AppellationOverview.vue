<script setup lang="ts">
import { computed } from 'vue'
import FigureRail from '@/components/editorial/FigureRail.vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import type { GrapeAppellationRecord } from '@/types/grapeAppellations'

const props = defineProps<{
  name: string
  imageUrl: string | null
  regionName: string
  countryName: string
  grapeRules: GrapeAppellationRecord[]
  description: string | null
  labelsHeld: number
  bottlesHeld: number
}>()

const permittedCount = computed(
  () => props.grapeRules.filter((rule) => rule.rule !== 'forbidden').length,
)

const figures = computed(() => [
  { label: 'Grapes permitted', value: permittedCount.value },
  { label: 'Rules catalogued', value: props.grapeRules.length },
  { label: 'Labels held', value: props.labelsHeld },
  { label: 'Bottles', value: props.bottlesHeld },
])

/** A single-sentence description reads badly in two columns. */
const twoColumn = computed(() => (props.description?.length ?? 0) > 240)
</script>

<template>
  <section class="grid grid-cols-[1fr_400px] items-start gap-8 max-lg:flex max-lg:flex-col">
    <div>
      <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
        Appellation profile &nbsp;·&nbsp; {{ regionName }}, {{ countryName }}
      </p>
      <h1 class="mb-4 font-heading text-[76px] font-normal leading-[0.95]">{{ name }}</h1>
      <p
        v-if="description"
        class="mb-4 hyphens-auto text-justify text-sm leading-[1.75] text-foreground/80"
        :class="twoColumn ? 'columns-2 gap-6' : 'max-w-[60ch]'"
      >
        {{ description }}
      </p>
      <FigureRail :figures="figures" orientation="horizontal" />
    </div>

    <PlateFigure
      class="max-lg:order-first"
      :src="imageUrl"
      :alt="`Map of ${name}`"
      aspect="1 / 1"
      :slot-label="`appellation map — ${name}`"
      :caption="`${name} within ${regionName}.`"
    />
  </section>
</template>
