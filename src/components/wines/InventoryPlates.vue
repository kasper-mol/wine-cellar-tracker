<script setup lang="ts">
import { Pencil, Trash2, Wine } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import PlateFigure from '@/components/editorial/PlateFigure.vue'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { formatPrice, formatWindow, lineValue } from '@/lib/cellar'
import type { CellarEntry } from '@/lib/cellar'
import type { UserWine } from '@/types/wines'

defineProps<{ entries: CellarEntry[] }>()

const emit = defineEmits<{
  drink: [wine: UserWine]
  edit: [wine: UserWine]
  delete: [wine: UserWine]
}>()
</script>

<template>
  <div class="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:gap-3">
    <article
      v-for="entry in entries"
      :key="entry.wine.id"
      class="group flex flex-col gap-3 rounded-md border border-border p-3 max-sm:gap-2 max-sm:p-2.5"
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

      <div class="-mx-1 -mb-1 flex justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          title="Open a bottle"
          :disabled="entry.wine.quantity === 0"
          @click="emit('drink', entry.wine)"
        >
          <Wine class="h-[15px] w-[15px]" :stroke-width="1.5" />
          <span class="sr-only">Open a bottle of {{ entry.wine.name }}</span>
        </Button>
        <Button variant="ghost" size="icon" title="Edit" @click="emit('edit', entry.wine)">
          <Pencil class="h-[15px] w-[15px]" :stroke-width="1.5" />
          <span class="sr-only">Edit {{ entry.wine.name }}</span>
        </Button>
        <Button
          variant="destructive"
          size="icon"
          title="Remove"
          @click="emit('delete', entry.wine)"
        >
          <Trash2 class="h-[15px] w-[15px]" :stroke-width="1.5" />
          <span class="sr-only">Remove {{ entry.wine.name }}</span>
        </Button>
      </div>
    </article>
  </div>
</template>
