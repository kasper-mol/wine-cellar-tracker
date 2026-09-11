<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FlavorLevelGroup from '@/components/FlavorDescriptors/FlavorLevelGroup.vue'
import { toRoman } from '@/lib/numberToWords'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'

defineOptions({
  name: 'FlavorsPage',
})

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { lexicon, clusters, descriptors, loading } = storeToRefs(flavorDescriptorsStore)

const lede = computed(() => {
  const intro =
    'The WSET Level 3 Wine-Lexicon: think in terms of primary, secondary and tertiary. ' +
    'Primary aromas come from the grape and fermentation, secondary from post-fermentation ' +
    'winemaking, tertiary from maturation.'
  if (!descriptors.value.length) return intro
  return `${intro} ${descriptors.value.length} descriptors across ${clusters.value.length} clusters.`
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
      v-else-if="!clusters.length"
      class="border-y border-border py-3 text-sm text-foreground/[0.55]"
    >
      No flavour clusters have been added yet.
    </p>

    <template v-else>
      <FlavorLevelGroup
        v-for="(entry, index) in lexicon"
        :key="entry.level"
        :level="entry.level"
        :numeral="`${toRoman(index + 1)}.`"
        :clusters="entry.clusters"
      />
      <p class="mt-4 text-[12px] italic text-foreground/[0.5]">
        The lexicon is a prompt and a guide, not a limit: any accurate descriptor is acceptable.
      </p>
    </template>
  </div>
</template>
