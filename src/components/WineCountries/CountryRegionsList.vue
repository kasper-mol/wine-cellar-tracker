<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

const props = defineProps<{
  regions: Array<{
    id: string
    name: string
    appellationCount: number
  }>
}>()

const emit = defineEmits<{ (e: 'select-region', id: string): void }>()

function handleClick(id: string) {
  emit('select-region', id)
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Explore regions</p>
        <h2 class="font-serif text-3xl font-semibold text-foreground">Wine Regions</h2>
      </div>
      <p class="text-sm text-muted-foreground">{{ regions.length }} regions found</p>
    </div>

    <div v-if="regions.length === 0" class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground">
      No regions found for this country.
    </div>
    <div v-else class="grid gap-6">
      <Card
        v-for="region in regions"
        :key="region.id"
        class="group cursor-pointer overflow-hidden border-border bg-card p-6 transition-all hover:shadow-lg"
        @click="handleClick(region.id)"
      >
        <div class="flex items-start gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <MapPin class="h-6 w-6 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="font-serif text-2xl font-semibold text-card-foreground transition-colors group-hover:text-primary">
              {{ region.name }}
            </h3>
            <p class="mt-2 text-sm text-muted-foreground">
              <span class="font-semibold text-foreground">{{ region.appellationCount }}</span>
              appellations
            </p>
          </div>
        </div>
      </Card>
    </div>
  </section>
</template>
