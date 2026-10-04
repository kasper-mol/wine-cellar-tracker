<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
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

/** With a map the hero spans the page and the figures stand beside the title on wide screens. */
const wide = useMediaQuery('(min-width: 1024px)')

const figures = computed(() => [
  { label: 'Regions', value: props.regionCount },
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
            Country profile
            <template v-if="country.code">&nbsp;·&nbsp; {{ country.code }}</template>
          </p>
          <h1 class="mb-4 font-heading text-[clamp(44px,12vw,72px)] font-normal leading-[0.95]">
            {{ country.name }}
          </h1>
          <p
            v-if="content"
            class="max-w-[68ch] hyphens-auto text-justify max-sm:text-left text-sm leading-[1.75] text-foreground/80"
          >
            {{ content.blurb }}
          </p>
        </div>
        <FigureRail :figures="figures" :orientation="wide ? 'stacked' : 'horizontal'" />
      </div>

      <WineMapDisplay
        class="mt-8"
        :map-key="mapKey"
        hint="Select a region on the map to read about it, or pick one from the list."
      />
    </template>

    <div v-else class="grid grid-cols-[1fr_440px] items-start gap-8 max-lg:flex max-lg:flex-col">
      <div>
        <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
          Country profile <template v-if="country.code">&nbsp;·&nbsp; {{ country.code }}</template>
        </p>
        <h1 class="mb-4 font-heading text-[clamp(44px,12vw,72px)] font-normal leading-[0.95]">
          {{ country.name }}
        </h1>
        <p
          v-if="content"
          class="mb-4 columns-2 gap-6 hyphens-auto max-md:columns-1 text-justify max-sm:text-left text-sm leading-[1.75] text-foreground/80"
        >
          {{ content.blurb }}
        </p>
        <FigureRail :figures="figures" orientation="horizontal" />
      </div>

      <PlateFigure
        class="max-lg:order-first max-md:order-none"
        :src="country.image_url"
        :alt="`Map of ${country.name}`"
        aspect="3 / 4"
        :slot-label="`interactive SVG map — ${country.name}`"
        caption="Regions are clickable; each shape links to its encyclopedia entry."
      />
    </div>
  </section>
</template>
