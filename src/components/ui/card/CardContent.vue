<script setup lang="ts">
import { cn } from '@/lib/utils'
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('px-6 pb-6 pt-0', $attrs.class as string)"
  >
    <slot />
  </div>
</template>

