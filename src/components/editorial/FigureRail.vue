<script setup lang="ts">
export interface Figure {
  label: string
  value: string | number
}

withDefaults(
  defineProps<{
    figures: Figure[]
    /** vertical — label/value on one baseline, ruled rows (the cellar ledger).
     *  stacked  — value over label, ruled rows (index entries).
     *  horizontal — value over label, cells divided by rules (hero rails). */
    orientation?: 'vertical' | 'stacked' | 'horizontal'
  }>(),
  { orientation: 'vertical' },
)
</script>

<template>
  <div v-if="orientation === 'horizontal'" class="flex flex-wrap gap-6 border-y border-border py-3">
    <div
      v-for="figure in figures"
      :key="figure.label"
      class="border-r border-border pr-6 last:border-r-0"
    >
      <p class="num font-heading text-[30px] leading-none">{{ figure.value }}</p>
      <p class="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        {{ figure.label }}
      </p>
    </div>
  </div>

  <div v-else-if="orientation === 'stacked'" class="border-l border-border pl-4">
    <div
      v-for="figure in figures"
      :key="figure.label"
      class="border-b border-border py-1.5 last:border-b-0"
    >
      <p class="num font-heading text-[28px] leading-none">{{ figure.value }}</p>
      <p class="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        {{ figure.label }}
      </p>
    </div>
  </div>

  <div v-else class="border-l border-border pl-4">
    <div
      v-for="figure in figures"
      :key="figure.label"
      class="flex items-baseline justify-between gap-3 border-b border-border py-2"
    >
      <span class="text-[11px] uppercase tracking-[0.12em] text-foreground/[0.55]">
        {{ figure.label }}
      </span>
      <span class="num font-heading text-[26px] leading-none">{{ figure.value }}</span>
    </div>
  </div>
</template>
