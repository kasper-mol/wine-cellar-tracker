<script setup lang="ts">
import { Wine } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

const props = defineProps<{
  appellations: Array<{
    id: string
    name: string
    regionName: string
    grapeCount: number
  }>
}>()

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()

function handleClick(id: string) {
  emit('select-appellation', id)
}
</script>

<template>
  <section>
    <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Appellation catalog</p>
        <h2 class="font-serif text-3xl font-semibold text-foreground">Appellations</h2>
      </div>
      <p class="text-sm text-muted-foreground">{{ appellations.length }} appellations listed</p>
    </div>

    <div
      v-if="appellations.length === 0"
      class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground"
    >
      No appellations found for this country yet.
    </div>
    <div v-else class="grid gap-6">
      <Card
        v-for="appellation in appellations"
        :key="appellation.id"
        class="group cursor-pointer overflow-hidden border-border bg-card p-6 transition-all hover:shadow-lg"
        @click="handleClick(appellation.id)"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ appellation.regionName }}</p>
            <h3 class="font-serif text-2xl font-semibold text-card-foreground transition-colors group-hover:text-primary">
              {{ appellation.name }}
            </h3>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wine class="h-6 w-6 text-primary" />
          </div>
        </div>
        <p class="mt-4 text-sm text-muted-foreground">
          <span class="font-semibold text-foreground">{{ appellation.grapeCount }}</span>
          grape rules
        </p>
      </Card>
    </div>
  </section>
</template>
