<script setup lang="ts">
withDefaults(
  defineProps<{
    src?: string | null
    alt: string
    caption?: string | null
    /** What belongs in this slot, set in the monospace chip of the placeholder. */
    slotLabel?: string
    /** CSS aspect-ratio, e.g. '3 / 4'. */
    aspect?: string
    /** false renders a plain mat — the typographic plate used where no
     * photograph is expected at all (user wines carry no image column). */
    striped?: boolean
  }>(),
  { src: null, caption: null, slotLabel: 'photograph', aspect: '4 / 3', striped: true },
)
</script>

<template>
  <figure>
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="plate w-full object-cover"
      :style="{ aspectRatio: aspect }"
    />
    <div
      v-else
      class="plate plate-empty flex p-3"
      :class="striped ? 'plate-stripe items-end' : 'items-center justify-center bg-secondary'"
      :style="{ aspectRatio: aspect }"
      role="img"
      :aria-label="alt"
    >
      <slot>
        <span
          class="bg-secondary px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.06em] text-neutral-700"
        >
          {{ slotLabel }}
        </span>
      </slot>
    </div>
    <figcaption v-if="caption" class="mt-1 text-[11px] text-foreground/[0.55]">
      {{ caption }}
    </figcaption>
  </figure>
</template>
