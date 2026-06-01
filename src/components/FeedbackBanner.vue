<script setup lang="ts">
defineProps<{
  feedback: { type: 'success' | 'error'; message: string } | null
}>()
</script>

<template>
  <div
    v-if="feedback"
    :class="[
      'rounded-lg border px-4 py-3 text-sm',
      feedback.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'border-destructive/40 bg-destructive/10 text-destructive',
    ]"
  >
    {{ feedback.message }}
  </div>
</template>
