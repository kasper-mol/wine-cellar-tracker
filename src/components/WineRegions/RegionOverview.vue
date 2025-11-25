<script setup lang="ts">
import MapViewer from '@/components/MapViewer.vue'

const props = defineProps<{
  region: {
    name: string
    image_url: string | null
  }
  countryName: string
  appellationCount: number
}>()
</script>

<template>
  <section class="grid gap-8 md:grid-cols-2">
    <MapViewer :image-url="region.image_url" :title="region.name" />

    <div class="flex flex-col justify-between space-y-6">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Region Overview</p>
        <h1 class="mt-2 font-serif text-4xl font-semibold text-foreground">{{ region.name }}</h1>
        <p class="mt-2 text-muted-foreground">{{ countryName }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-xl border border-border px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Country</p>
          <p class="text-xl font-semibold text-foreground">{{ countryName }}</p>
        </div>
        <div class="rounded-xl border border-border px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-muted-foreground">Appellations</p>
          <p class="text-xl font-semibold text-foreground">{{ appellationCount }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
