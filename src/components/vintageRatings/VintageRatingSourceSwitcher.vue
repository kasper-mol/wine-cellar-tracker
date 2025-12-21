<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'

import type { VintageRatingsBySource } from '@/services/vintageRatings'

const props = defineProps<{
  sources: VintageRatingsBySource[]
  modelValue: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const selectedSourceId = computed({
  get: () => props.modelValue ?? props.sources[0]?.source_id ?? null,
  set: (value) => {
    if (value) emit('update:modelValue', value)
  },
})
</script>

<template>
  <div v-if="sources.length > 1" class="flex flex-wrap gap-2">
    <Button
      v-for="source in sources"
      :key="source.source_id"
      size="sm"
      :variant="selectedSourceId === source.source_id ? 'default' : 'outline'"
      @click="selectedSourceId = source.source_id"
    >
      {{ source.source_name }}
    </Button>
  </div>
</template>
