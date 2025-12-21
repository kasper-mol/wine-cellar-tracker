<script setup lang="ts">
import { Wine } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'

defineProps<{
  appellations: Array<{
    id: string
    name: string
  }>
}>()

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()
</script>

<template>
  <section>
    <div class="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Regional catalog</p>
        <h2 class="font-serif text-3xl font-semibold text-foreground">Appellations</h2>
      </div>
      <p class="text-sm text-muted-foreground">{{ appellations.length }} entries</p>
    </div>

    <div
      v-if="appellations.length === 0"
      class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground"
    >
      No appellations found for this region.
    </div>
    <div v-else class="grid grid-cols-2 gap-6">
      <Card
        v-for="appellation in appellations"
        :key="appellation.id"
        class="group cursor-pointer overflow-hidden border-border bg-card p-6 transition-all hover:shadow-lg"
        @click="emit('select-appellation', appellation.id)"
      >
        <div class="flex items-center justify-between">
          <h3
            class="font-serif text-2xl font-semibold text-card-foreground transition-colors group-hover:text-primary"
          >
            {{ appellation.name }}
          </h3>
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Wine class="h-5 w-5 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  </section>
</template>
