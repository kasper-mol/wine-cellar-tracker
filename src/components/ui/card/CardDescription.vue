<script setup lang="ts">
import { cn } from '@/lib/utils'
</script>

<template>
  <p
    v-bind="$attrs"
    :class="cn('text-sm text-muted-foreground', $attrs.class as string)"
  >
    <slot />
  </p>
</template>

