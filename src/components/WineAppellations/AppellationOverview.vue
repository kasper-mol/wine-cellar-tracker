<script setup lang="ts">
import { computed } from 'vue'
import MapViewer from '@/components/MapViewer.vue'

const props = defineProps<{
  name: string
  imageUrl: string | null
  regionName: string
  countryName: string
  grapeCount: number
}>()

const stats = computed(() => [
  { label: 'Region', value: props.regionName },
  { label: 'Country', value: props.countryName },
  { label: 'Grape Rules', value: `${props.grapeCount}` },
])
</script>

<template>
  <section class="grid gap-8 md:grid-cols-2">
    <MapViewer :image-url="imageUrl" :title="name" />

    <div class="flex flex-col justify-between space-y-6">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Appellation Profile</p>
        <h1 class="mt-2 font-serif text-4xl font-semibold text-foreground">{{ name }}</h1>
        <p class="mt-2 text-muted-foreground">{{ regionName }} • {{ countryName }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="rounded-xl border border-border px-4 py-3"
        >
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ stat.label }}</p>
          <p class="text-xl font-semibold text-foreground">{{ stat.value }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
