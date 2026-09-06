<script setup lang="ts">
import { computed } from 'vue'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import RegionAppellationsList from './RegionAppellationsList.vue'
import { regionBlurb } from '@/content/regions'

const props = defineProps<{
  region: {
    name: string
    image_url: string | null
  }
  countryName: string
  appellationCount: number
  regionAppellations: Array<{
    id: string
    name: string
  }>
}>()

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()

const blurb = computed(() => regionBlurb(props.region.name))
</script>

<template>
  <section class="grid grid-cols-[1fr_420px] items-start gap-8 max-lg:flex max-lg:flex-col">
    <div>
      <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">
        Region overview &nbsp;·&nbsp; {{ countryName }}
      </p>
      <h1 class="mb-4 font-heading text-[72px] font-normal leading-[0.95]">{{ region.name }}</h1>
      <p
        v-if="blurb"
        class="mb-4 max-w-[60ch] hyphens-auto text-justify text-sm leading-[1.75] text-foreground/80"
      >
        {{ blurb }}
      </p>
      <RegionAppellationsList
        :appellations="regionAppellations"
        @select-appellation="(id: string) => emit('select-appellation', id)"
      />
    </div>

    <PlateFigure
      class="max-lg:order-first"
      :src="region.image_url"
      :alt="`Map of ${region.name}`"
      aspect="4 / 3"
      :slot-label="`region map — ${region.name}`"
      :caption="`${appellationCount} appellations catalogued in ${region.name}.`"
    />
  </section>
</template>
