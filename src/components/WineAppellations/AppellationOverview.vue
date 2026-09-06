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
  pronunciation: string | null
  classification: string | null
  establishedYear: number | null
  labelsHeld: number
  bottlesHeld: number
}>()

/** Legal tier and year are separate columns; either can stand alone on the meta line. */
const hasMeta = computed(() => Boolean(props.classification) || props.establishedYear !== null)

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
      <h1
        class="font-heading text-[76px] font-normal leading-[0.95]"
        :class="pronunciation || hasMeta ? 'mb-2' : 'mb-4'"
      >
        {{ name }}
      </h1>

      <p v-if="pronunciation" class="mb-2 text-sm italic text-foreground/[0.58]">
        {{ pronunciation }}
      </p>

      <div
        v-if="hasMeta"
        class="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-y border-border py-2 text-[11px] uppercase tracking-[0.12em] text-foreground/[0.52]"
      >
        <span v-if="classification">{{ classification }}</span>
        <span v-if="establishedYear !== null" class="num">Established {{ establishedYear }}</span>
      </div>

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
