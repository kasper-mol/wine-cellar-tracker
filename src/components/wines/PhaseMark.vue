<script setup lang="ts">
import { computed } from 'vue'
import { PHASE_COLOR, PHASE_LABEL, PHASE_TITLE } from '@/lib/phase'
import type { PhaseNow } from '@/types/drinkingWindow'

const props = withDefaults(
  defineProps<{
    phase: PhaseNow
    /** Height of the mark in px — 11 in tables and cards, 13 in section heads. */
    size?: number
  }>(),
  { size: 11 },
)

const color = computed(() => PHASE_COLOR[props.phase])
</script>

<template>
  <span class="inline-flex cursor-help items-baseline gap-1.5" :title="PHASE_TITLE[phase]">
    <span
      class="inline-block w-[3px] shrink-0 self-center"
      :style="{ height: `${size}px`, background: color }"
      aria-hidden="true"
    />
    <span class="text-[10px] uppercase tracking-[0.12em]" :style="{ color }">
      {{ PHASE_LABEL[phase] }}
    </span>
  </span>
</template>
