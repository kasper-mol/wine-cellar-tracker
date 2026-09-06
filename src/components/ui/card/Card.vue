<script setup lang="ts">
import { cn } from '@/lib/utils'
</script>

<template>
  <div
    v-bind="$attrs"
    :class="
      cn(
        'flex flex-col gap-2 rounded-md border bg-transparent p-3 text-card-foreground shadow-none',
        $attrs.class as string,
      )
    "
  >
    <slot />
  </div>
</template>
