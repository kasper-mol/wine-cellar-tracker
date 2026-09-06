<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FlavorLevelGroup from '@/components/FlavorDescriptors/FlavorLevelGroup.vue'
import { toRoman } from '@/lib/numberToWords'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import type { FlavorDescriptorRecord } from '@/types/flavorDescriptors'

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

  return Array.from(levels, ([level, categories], index) => ({
    level,
    numeral: `${toRoman(index + 1)}.`,
    categories: Array.from(categories, ([name, items]) => ({
      name,
      descriptors: items,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  }))
})

const categoryCount = computed(() =>
  groupedLevels.value.reduce((sum, level) => sum + level.categories.length, 0),
)

const lede = computed(() => {
  const wheel =
    'The descriptor set, arranged as the aroma wheel arranges it: primary aromas from the grape, ' +
    'secondary from winemaking, tertiary from age.'
  if (!descriptors.value.length) return wheel
  return `${wheel} ${descriptors.value.length} descriptors across ${categoryCount.value} categories.`
})

onMounted(async () => {
  await flavorDescriptorsStore.loadAll()
})
</script>

<template>
  <div>
    <EditorialHeader
      kicker="The Encyclopedia · Book IV"
      title="Flavour &amp; aroma"
      :lede="lede"
      :title-size="64"
      :lede-width="62"
    />
    <div class="rule-dbl mb-6 mt-6" />

    <div v-if="loading" class="border-t border-border">
      <div v-for="row in 8" :key="`flavor-skeleton-${row}`" class="border-b border-border py-2">
        <span class="block h-4 w-full bg-foreground/[0.06]" />
      </div>
    </div>

    <p
      v-else-if="!groupedLevels.length"
      class="border-y border-border py-3 text-sm text-foreground/[0.55]"
    >
      No flavour descriptors have been added yet.
    </p>

    <template v-else>
      <FlavorLevelGroup
        v-for="level in groupedLevels"
        :key="level.level"
        :level="level.level"
        :numeral="level.numeral"
        :categories="level.categories"
      />
    </template>
  </div>
</template>
