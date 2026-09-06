<script setup lang="ts">
import { Button } from '@/components/ui/button'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { formatWindow } from '@/lib/cellar'
import type { CellarEntry } from '@/lib/cellar'

defineProps<{
  /** At most four, sorted by drink-by date. */
  entries: CellarEntry[]
  /** e.g. "Four labels at or past peak — eleven bottles" */
  summary: string | null
  /** Year the earliest window opens, for the empty state. */
  earliestOpening: number | null
}>()

const emit = defineEmits<{ drink: [entry: CellarEntry] }>()
</script>

<template>
  <section class="mb-8">
    <div class="mb-4 flex items-baseline gap-3">
      <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">I.</span>
      <h2 class="font-heading text-[34px] font-normal">Ready this season</h2>
      <span v-if="summary" class="ml-auto text-xs text-foreground/50">{{ summary }}</span>
    </div>

    <div v-if="entries.length" class="grid grid-cols-4 border-t border-border max-lg:grid-cols-2">
      <article
        v-for="entry in entries"
        :key="entry.wine.id"
        class="group flex flex-col gap-2 border-r border-border px-4 py-4 last:border-r-0"
      >
        <PhaseMark v-if="entry.window" :phase="entry.window.phaseNow" />
        <p class="num font-heading text-[44px] font-normal leading-[0.9] text-foreground/[0.88]">
          {{ entry.wine.vintage || 'NV' }}
        </p>
        <h3
          class="text-[19px] font-semibold leading-[1.2] transition-colors group-hover:text-accent-700"
        >
          {{ entry.wine.name }}
        </h3>
        <p v-if="entry.wine.producer" class="text-[13px] italic text-foreground/[0.62]">
          {{ entry.wine.producer }}
        </p>
        <p class="num text-xs text-foreground/[0.55]">
          {{ formatWindow(entry.window) }} &nbsp;·&nbsp; {{ entry.wine.quantity }} bottles
        </p>
        <Button
          size="sm"
          class="mt-auto self-start"
          :disabled="entry.wine.quantity === 0"
          @click="emit('drink', entry)"
        >
          Open a bottle
        </Button>
      </article>
    </div>

    <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      Nothing is at peak right now<template v-if="earliestOpening">
        — the earliest window opens in {{ earliestOpening }}</template
      >.
    </p>
  </section>
</template>
