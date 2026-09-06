<script setup lang="ts">
import { computed } from 'vue'
import FigureRail from '@/components/editorial/FigureRail.vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import WineMapDisplay from '@/components/WineCountries/wineMapDisplay.vue'
import { countryContent } from '@/content/countries'

const props = defineProps<{
  country: {
    name: string
    code: string | null
    image_url: string | null
  }
  regionCount: number
  appellationCount: number
  labelsHeld: number
  bottlesHeld: number
  mapKey: string | null
}>()

const content = computed(() => countryContent(props.country.name))

const figures = computed(() => [
  { label: 'Regions', value: props.regionCount },
  { label: 'Appellations', value: props.appellationCount },
  { label: 'Labels held', value: props.labelsHeld },
  { label: 'Bottles', value: props.bottlesHeld },
])
</script>

<template>
  <section class="grid grid-cols-[1fr_440px] items-start gap-8 max-lg:flex max-lg:flex-col">
    <div>
      <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
        Country profile <template v-if="country.code">&nbsp;·&nbsp; {{ country.code }}</template>
      </p>
      <h1 class="mb-4 font-heading text-[72px] font-normal leading-[0.95]">{{ country.name }}</h1>
      <p
        v-if="content"
        class="mb-4 columns-2 gap-6 hyphens-auto text-justify text-sm leading-[1.75] text-foreground/80"
      >
        {{ content.blurb }}
      </p>
      <FigureRail :figures="figures" orientation="horizontal" />
    </div>

    <figure v-if="mapKey" class="max-lg:order-first">
      <WineMapDisplay :map-key="mapKey" />
      <figcaption class="mt-1 text-[11px] text-foreground/[0.55]">
        Regions are clickable; each shape links to its encyclopedia entry.
      </figcaption>
    </figure>
    <PlateFigure
      v-else
      class="max-lg:order-first"
      :src="country.image_url"
      :alt="`Map of ${country.name}`"
      aspect="3 / 4"
      :slot-label="`interactive SVG map — ${country.name}`"
      caption="Regions are clickable; each shape links to its encyclopedia entry."
    />
  </section>
</template>
