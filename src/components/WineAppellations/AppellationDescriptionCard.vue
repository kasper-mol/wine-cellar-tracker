<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui/card'

const props = defineProps<{
  description?: string | null
}>()

const trimmedDescription = computed(() => (props.description ?? '').trim())
const hasDescription = computed(() => trimmedDescription.value.length > 0)
</script>

<template>
  <div>
    <Card class="border-border bg-card p-6 shadow-sm">
      <p
        v-if="hasDescription"
        class="text-base leading-relaxed text-muted-foreground whitespace-pre-line"
      >
        {{ trimmedDescription }}
      </p>
      <p v-else class="text-muted-foreground">No description available yet.</p>
    </Card>
  </div>
</template>
