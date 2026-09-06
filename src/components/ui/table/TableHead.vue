<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <th
    :class="
      cn(
        'border-b border-border px-2 py-2 text-left align-bottom text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </th>
</template>
