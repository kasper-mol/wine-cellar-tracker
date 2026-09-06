<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    note?: string | null
    kicker?: string
  }>(),
  { note: null, kicker: 'Administration' },
)
</script>

<template>
  <header class="mb-4">
    <div class="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p class="mb-2 text-[11px] uppercase tracking-[0.18em] text-accent-700">{{ kicker }}</p>
        <h1 class="font-heading text-[52px] font-normal leading-none">{{ title }}</h1>
      </div>
      <slot name="actions" />
    </div>
    <p v-if="note" class="mt-4 max-w-[58ch] text-sm leading-[1.7] text-foreground/[0.72]">
      {{ note }}
    </p>
  </header>
</template>
