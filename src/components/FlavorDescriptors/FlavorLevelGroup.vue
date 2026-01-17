<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import FlavorCategoryGroup from '@/components/FlavorDescriptors/FlavorCategoryGroup.vue'
import type { FlavorDescriptorRecord } from '@/services/flavorDescriptors'

const props = defineProps<{
  level: string
  categories: { name: string; descriptors: FlavorDescriptorRecord[] }[]
}>()

const totalCount = computed(() =>
  props.categories.reduce((sum, category) => sum + category.descriptors.length, 0),
)

function formatLevel(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}
</script>

<template>
  <Card class="border-border bg-card/40 p-6">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-serif text-3xl font-semibold text-foreground">
        {{ formatLevel(level) }}
      </h2>
      <span class="text-sm text-muted-foreground">{{ totalCount }} flavors</span>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <FlavorCategoryGroup
        v-for="category in categories"
        :key="`${level}-${category.name}`"
        :title="category.name"
        :descriptors="category.descriptors"
      />
    </div>
  </Card>
</template>
