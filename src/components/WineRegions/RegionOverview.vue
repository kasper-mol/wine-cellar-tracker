<script setup lang="ts">
import { computed } from 'vue'
import FigureRail from '@/components/editorial/FigureRail.vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import WineMapDisplay from '@/components/WineCountries/wineMapDisplay.vue'
import { regionBlurb } from '@/content/regions'

const props = defineProps<{
  region: {
    name: string
    image_url: string | null
  }
  countryName: string
  appellationCount: number
  labelsHeld: number
  bottlesHeld: number
  /** Key of the region's interactive map, when it has one. */
  mapKey: string | null
}>()

const blurb = computed(() => regionBlurb(props.region.name))

const figures = computed(() => [
  { label: 'Appellations', value: props.appellationCount },
  { label: 'Labels held', value: props.labelsHeld },
  { label: 'Bottles', value: props.bottlesHeld },
])
</script>

<template>
  <section>
    <!-- With an interactive map the hero spans the page and the map gets a full-width stage below. -->
    <template v-if="mapKey">
      <div class="grid items-end gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
            Region overview &nbsp;·&nbsp; {{ countryName }}
          </p>
          <h1 class="mb-4 font-heading text-[clamp(44px,12vw,72px)] font-normal leading-[0.95]">
            {{ region.name }}
          </h1>
          <p
            v-if="blurb"
            class="max-w-[60ch] hyphens-auto text-justify max-sm:text-left text-sm leading-[1.75] text-foreground/80"
          >
            {{ blurb }}
          </p>
          <FigureRail :figures="figures" :orientation="'horizontal'" />
        </div>
      </div>

      <WineMapDisplay
        class="mt-8"
        :map-key="mapKey"
        hint="Select an area on the map to read about its appellation, or pick one from the list."
      />
    </template>

    <div v-else class="grid grid-cols-[1fr_440px] items-start gap-8 max-lg:flex max-lg:flex-col">
      <div>
        <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
          Region overview &nbsp;·&nbsp; {{ countryName }}
        </p>
        <h1 class="mb-4 font-heading text-[clamp(44px,12vw,72px)] font-normal leading-[0.95]">
          {{ region.name }}
        </h1>
        <p
          v-if="blurb"
          class="mb-4 max-w-[60ch] hyphens-auto text-justify max-sm:text-left text-sm leading-[1.75] text-foreground/80"
        >
          {{ blurb }}
        </p>
        <FigureRail :figures="figures" orientation="horizontal" />
      </div>

      <PlateFigure
        class="max-lg:order-first max-md:order-none max-lg:w-full"
        :src="region.image_url"
        :alt="`Map of ${region.name}`"
        aspect="4 / 3"
        :slot-label="`region map — ${region.name}`"
        :caption="`${appellationCount} appellations catalogued in ${region.name}.`"
      />
    </div>
  </section>
</template>
