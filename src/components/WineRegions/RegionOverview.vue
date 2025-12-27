<script setup lang="ts">
import MapViewer from '@/components/MapViewer.vue'
import RegionAppellationsList from './RegionAppellationsList.vue'
import { onMounted } from 'vue'

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

onMounted(() => {
  console.log(props.regionAppellations)
})

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()
</script>

<template>
  <section class="grid gap-8 md:grid-cols-2">
    <MapViewer :image-url="region.image_url" :title="region.name" />

    <div class="flex flex-col space-y-6">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Region Overview</p>
        <h1 class="mt-2 font-serif text-4xl font-semibold text-foreground">{{ region.name }}</h1>
        <p class="mt-2 text-muted-foreground">{{ countryName }}</p>
      </div>
      <RegionAppellationsList
        :appellations="regionAppellations"
        @select-appellation="(id: string) => emit('select-appellation', id)"
      />
    </div>
  </section>
</template>
