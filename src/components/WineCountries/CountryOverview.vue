<script setup lang="ts">
import { computed } from 'vue'
import { Map, Wine } from 'lucide-vue-next'
import MapViewer from '@/components/MapViewer.vue'

const props = defineProps<{
  country: {
    name: string
    code: string | null
    image_url: string | null
  }
  regionCount: number
  appellationCount: number
}>()

const stats = computed(() => [
  { label: 'Regions', value: props.regionCount, icon: Map },
  { label: 'Appellations', value: props.appellationCount, icon: Wine },
])
</script>

<template>
  <section class="grid gap-8 md:grid-cols-2">
    <MapViewer :image-url="country.image_url" :title="country.name" />

    <div class="flex flex-col space-y-6">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Country Profile</p>
        <h1 class="mt-2 font-serif text-4xl font-semibold text-foreground">{{ country.name }}</h1>
        <p v-if="country.code" class="mt-2 text-muted-foreground">ISO Code: {{ country.code }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="flex items-center gap-4 rounded-xl border border-border px-4 py-3"
        >
          <component :is="stat.icon" class="h-6 w-6 text-primary" />
          <div>
            <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
            <p class="text-2xl font-semibold text-foreground">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
