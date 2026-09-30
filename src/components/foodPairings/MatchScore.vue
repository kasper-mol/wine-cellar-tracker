<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  /** 0–10; shown rounded to a whole number. */
  match: number
}>()

const rounded = computed(() => Math.max(0, Math.min(10, Math.round(props.match))))
const label = computed(() => `Match ${rounded.value} out of 10`)

/** Top scores read in the accent; weak ones recede. */
const tone = computed(() =>
  rounded.value >= 8
    ? 'text-primary'
    : rounded.value >= 6
      ? 'text-foreground/[0.85]'
      : 'text-foreground/[0.5]',
)
</script>

<template>
  <span class="inline-flex min-w-[58px] flex-col" role="img" :aria-label="label" :title="label">
    <span class="num whitespace-nowrap font-heading text-[28px] leading-none" :class="tone">
      {{ rounded }}<span class="ml-px text-[11px] text-foreground/[0.5]">/10</span>
    </span>
    <span class="mt-1.5 block h-[2px] w-full bg-foreground/[0.1]" aria-hidden="true">
      <span class="block h-full bg-primary" :style="{ width: `${rounded * 10}%` }" />
    </span>
  </span>
</template>
