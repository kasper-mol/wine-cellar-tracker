<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import FigureRail from '@/components/editorial/FigureRail.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import { useFoodPairingsStore } from '@/stores/foodPairings'

defineOptions({
  name: 'FoodPairingManageIndexPage',
})

const store = useFoodPairingsStore()
const { tags, wineStyleFoodPairings, dishPresets, unmatchedQueries } = storeToRefs(store)

onMounted(() => {
  // Each load is independent: a failing one only leaves its own figure at zero.
  void store.loadVocabulary().catch(() => undefined)
  void store.loadSearchQueries().catch(() => undefined)
})

/** A tag with no positive style rating can never be recommended for. */
const untaggedCount = computed(
  () =>
    tags.value.filter(
      (tag) =>
        !wineStyleFoodPairings.value.some((row) => row.food_tag_id === tag.id && row.affinity > 0),
    ).length,
)

const figures = computed(() => [
  { label: 'Food tags', value: tags.value.length },
  { label: 'Style pairings', value: wineStyleFoodPairings.value.length },
  { label: 'Quick picks', value: dishPresets.value.length },
  { label: 'Unmatched searches', value: unmatchedQueries.value.length },
])

const sections = [
  {
    name: 'Food tags',
    to: '/manage/food-pairing/tags',
    description:
      'The vocabulary a dish is described with. Each tag has synonyms; free text is matched against them. Includes a live tester that shows how any phrase is read.',
  },
  {
    name: 'Style baseline',
    to: '/manage/food-pairing/baseline',
    description:
      'Rate each wine style against each food tag (−2 to +2). This is what gives every appellation a recommendation without curating it one by one.',
  },
  {
    name: 'Quick picks',
    to: '/manage/food-pairing/presets',
    description:
      'The tappable dishes on the pairing page. Each is just a named bundle of food tags.',
  },
  {
    name: 'Unmatched searches',
    to: '/manage/food-pairing/searches',
    description:
      'What people typed that no tag could read, most-asked first. Turn the frequent ones into synonyms or new tags.',
  },
  {
    name: 'Appellation overrides',
    to: '/manage/wine-appellations',
    description:
      'Appellation-specific pairings (Sancerre + goat cheese) are set per style in each appellation’s editor, on top of the baseline.',
  },
]
</script>

<template>
  <div>
    <ManageHeader
      title="Food pairing"
      note="The vocabulary and rules behind the pairing search. Matching is plain phrase-and-typo matching over these tables — no AI — so every result can be traced back to a row here."
    />

    <ManageTabs />

    <FigureRail :figures="figures" orientation="horizontal" class="mb-8" />

    <div class="border-t border-border">
      <RouterLink
        v-for="s in sections"
        :key="s.to"
        :to="s.to"
        class="group grid grid-cols-[220px_1fr] items-baseline gap-4 border-b border-border px-2 py-4 transition-colors hover:bg-primary/5 max-md:grid-cols-1"
      >
        <h2 class="font-heading text-[21px] transition-colors group-hover:text-accent-700">
          {{ s.name }}
        </h2>
        <p class="text-[13px] leading-[1.6] text-foreground/[0.74]">{{ s.description }}</p>
      </RouterLink>
    </div>

    <p v-if="untaggedCount" class="mt-4 text-xs text-foreground/50">
      {{ untaggedCount }} food tag{{ untaggedCount === 1 ? ' has' : 's have' }} no positive style
      rating yet, so nothing is recommended for {{ untaggedCount === 1 ? 'it' : 'them' }}.
    </p>
  </div>
</template>
