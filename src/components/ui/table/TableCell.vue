<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <td :class="cn('border-b border-border px-2 py-2 align-middle', props.class)">
    <slot />
  </td>
</template>
