<script setup lang="ts">
withDefaults(
  defineProps<{
    kicker?: string
    title: string
    lede?: string | null
    /** Display size in px — the bigger it sets, the lighter it reads. */
    titleSize?: number
    /** Measure of the lede, in characters. */
    ledeWidth?: number
  }>(),
  { titleSize: 64, ledeWidth: 60 },
)
</script>

<template>
  <header>
    <p v-if="kicker" class="num mb-3 text-[11px] uppercase tracking-[0.18em] text-accent-700">
      {{ kicker }}
    </p>
    <div class="flex flex-wrap items-end justify-between gap-6">
      <h1
        class="mb-3 font-heading font-normal leading-[0.95] tracking-[-0.02em]"
        :style="{ fontSize: `${titleSize}px` }"
      >
        {{ title }}
      </h1>
      <slot name="controls" />
    </div>
    <p
      v-if="lede"
      class="text-justify text-[15px] leading-[1.7] text-foreground/[0.78]"
      :style="{ maxWidth: `${ledeWidth}ch` }"
    >
      {{ lede }}
    </p>
    <slot />
  </header>
</template>
