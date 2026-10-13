<script setup lang="ts">
defineProps<{
  items: { id: string; displayName: string }[]
  /** The area to colour as current: hovered, else selected. */
  activeId: string | null
  /** Two columns from `sm` up; off in a narrow container such as the phone sheet. */
  columns?: boolean
}>()

defineEmits<{
  /** An area is pointed at or focused (`id`), or no longer is (`null`). */
  hover: [id: string | null]
  select: [id: string]
}>()
</script>

<template>
  <div>
    <p class="text-[11px] uppercase tracking-[0.18em] text-accent-700">
      Areas &nbsp;·&nbsp; {{ items.length }}
    </p>

    <ul class="m-0 mt-2 list-none p-0" :class="{ 'sm:columns-2 sm:gap-x-6': columns }">
      <li v-for="item in items" :key="item.id" class="break-inside-avoid">
        <button
          type="button"
          class="group flex w-full items-baseline justify-between gap-2 border-b border-border py-2 text-left font-heading text-[19px] leading-tight transition-colors hover:text-accent-700 max-lg:min-h-12 max-lg:items-center max-lg:py-3"
          :class="{ 'text-accent-700': activeId === item.id }"
          @mouseenter="$emit('hover', item.id)"
          @mouseleave="$emit('hover', null)"
          @focus="$emit('hover', item.id)"
          @blur="$emit('hover', null)"
          @click="$emit('select', item.id)"
        >
          <span>{{ item.displayName }}</span>
          <span
            aria-hidden="true"
            class="font-body text-xs text-foreground/30 transition-colors group-hover:text-accent-700"
          >
            →
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
