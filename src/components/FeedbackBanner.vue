<script setup lang="ts">
defineProps<{
  feedback: { type: 'success' | 'error'; message: string } | null
}>()
</script>

<template>
  <p
    v-if="feedback"
    :class="[
      'border-l-2 py-1.5 pl-3 text-[13px]',
      feedback.type === 'success'
        ? 'border-primary text-accent-700'
        : 'border-destructive text-destructive',
    ]"
  >
    {{ feedback.message }}
  </p>
</template>
