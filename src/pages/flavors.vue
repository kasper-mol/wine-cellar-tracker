<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Sparkles } from 'lucide-vue-next'

import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import type { FlavorDescriptorRecord } from '@/services/flavorDescriptors'
import FlavorLevelGroup from '@/components/FlavorDescriptors/FlavorLevelGroup.vue'

defineOptions({
  name: 'FlavorsPage',
})

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { descriptors, loading } = storeToRefs(flavorDescriptorsStore)

const groupedLevels = computed(() => {
  const levels = new Map<string, Map<string, FlavorDescriptorRecord[]>>()

  for (const descriptor of descriptors.value) {
    const level = descriptor.level
    const category = descriptor.category?.trim() || 'Uncategorized'

    if (!levels.has(level)) {
      levels.set(level, new Map())
    }

    const categories = levels.get(level)!
    if (!categories.has(category)) {
      categories.set(category, [])
    }

    categories.get(category)!.push(descriptor)
  }

  return Array.from(levels, ([level, categories]) => ({
    level,
    categories: Array.from(categories, ([name, descriptors]) => ({
      name,
      descriptors,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  }))
})

onMounted(async () => {
  await flavorDescriptorsStore.loadAll()
})
</script>

<template>
  <div class="min-h-screen">
    <div class="container">
      <div class="mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
          <Sparkles class="h-4 w-4 text-primary" />
          <span class="text-sm font-medium text-primary">Flavor Descriptors</span>
        </div>
        <h1 class="mb-4 font-serif text-5xl font-bold text-foreground">Explore Flavors</h1>
        <p class="max-w-3xl text-lg text-muted-foreground">
          Browse the building blocks of aroma and taste, organized by intensity level and category
          for faster pairing and discovery.
        </p>
      </div>

      <p v-if="loading" class="text-muted-foreground">Loading flavors...</p>

      <div
        v-else-if="groupedLevels.length === 0"
        class="rounded-lg border border-dashed border-muted p-8 text-center text-muted-foreground"
      >
        No flavor descriptors have been added yet.
      </div>

      <div v-else class="space-y-8">
        <FlavorLevelGroup
          v-for="level in groupedLevels"
          :key="level.level"
          :level="level.level"
          :categories="level.categories"
        />
      </div>
    </div>
  </div>
</template>
