<script setup lang="ts">
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { formatPrice, formatWindow, lineValue } from '@/lib/cellar'
import type { CellarEntry } from '@/lib/cellar'

defineProps<{ entries: CellarEntry[] }>()
</script>

<template>
  <div class="grid grid-cols-4 gap-4 max-lg:grid-cols-2">
    <article
      v-for="entry in entries"
      :key="entry.wine.id"
      class="group flex flex-col gap-3 rounded-md border border-border p-3"
      :class="entry.wine.quantity === 0 && 'opacity-45'"
    >
      <!-- No image column exists on user wines yet; the plate is typographic. -->
      <PlateFigure
        :alt="`${entry.wine.vintage || 'NV'} ${entry.wine.name}`"
        aspect="3 / 4"
        :striped="false"
      >
        <span class="flex flex-col items-center gap-1 text-center">
          <span class="num font-heading text-[38px] leading-none text-foreground/[0.7]">
            {{ entry.wine.vintage || 'NV' }}
          </span>
          <span class="text-[11px] italic text-foreground/[0.55]">
            {{ entry.wine.producer || entry.wine.name }}
          </span>
        </span>
      </PlateFigure>

      <div class="flex items-baseline gap-1.5">
        <PhaseMark v-if="entry.window" :phase="entry.window.phaseNow" />
        <span v-else class="text-[10px] uppercase tracking-[0.12em] text-foreground/50">
          Unmapped
        </span>
        <span class="num ml-auto text-xs text-foreground/50">{{ entry.wine.quantity }} btl</span>
      </div>

      <div>
        <h3
          class="font-heading text-[17px] font-semibold leading-[1.2] transition-colors group-hover:text-accent-700"
        >
          {{ entry.wine.name }}
        </h3>
        <p v-if="entry.wine.producer" class="mt-0.5 text-xs italic text-foreground/[0.58]">
          {{ entry.wine.producer }}
        </p>
      </div>

      <p class="num text-xs text-foreground/[0.55]">
        {{ entry.wine.vintage || 'NV' }} &nbsp;·&nbsp;
        {{ entry.wine.appellationName || entry.wine.regionName || '—' }}
      </p>

      <p
        class="num mt-auto flex justify-between border-t border-border pt-2 text-[11px] text-foreground/50"
      >
        <span>{{ formatWindow(entry.window) }}</span>
        <span>{{ formatPrice(lineValue(entry.wine)) }}</span>
      </p>
    </article>
  </div>
</template>
