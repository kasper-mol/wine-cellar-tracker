<script setup lang="ts">
import { cn } from '@/lib/utils'
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('rounded-2xl border bg-card text-card-foreground shadow-sm', $attrs.class as string)"
  >
    <slot />
  </div>
</template>

