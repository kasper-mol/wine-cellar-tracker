<script setup lang="ts">
import { computed } from 'vue'
import FlavorCategoryGroup from '@/components/FlavorDescriptors/FlavorCategoryGroup.vue'
import { levelGloss } from '@/content/flavorLevels'
import type { FlavorDescriptorRecord } from '@/types/flavorDescriptors'

const props = defineProps<{
  level: string
  numeral: string
  categories: { name: string; descriptors: FlavorDescriptorRecord[] }[]
}>()

const totalCount = computed(() =>
  props.categories.reduce((sum, category) => sum + category.descriptors.length, 0),
)

const gloss = computed(() => levelGloss(props.level))

function formatLevel(value: string) {
  return value
    .replace(/_/g, ' ')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}
</script>

<template>
  <section class="mb-8">
    <div class="mb-4 flex flex-wrap items-baseline gap-3 border-b border-border pb-2">
      <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">{{ numeral }}</span>
      <h2 class="font-heading text-[34px] font-normal">{{ formatLevel(level) }}</h2>
      <span v-if="gloss" class="text-xs italic text-foreground/[0.58]">{{ gloss }}</span>
      <span class="num ml-auto text-xs text-foreground/50">{{ totalCount }} descriptors</span>
    </div>

    <div class="grid grid-cols-4 gap-6 max-lg:grid-cols-2">
      <FlavorCategoryGroup
        v-for="category in categories"
        :key="`${level}-${category.name}`"
        :title="category.name"
        :descriptors="category.descriptors"
      />
    </div>
  </section>
</template>
