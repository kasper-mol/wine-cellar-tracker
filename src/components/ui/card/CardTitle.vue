<script setup lang="ts">
import { cn } from '@/lib/utils'
</script>

<template>
  <h3
    v-bind="$attrs"
    :class="cn('text-2xl font-semibold leading-none tracking-tight', $attrs.class as string)"
  >
    <slot />
  </h3>
</template>

