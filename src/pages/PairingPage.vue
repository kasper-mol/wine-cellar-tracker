<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FoodPairingSearch from '@/components/foodPairings/FoodPairingSearch.vue'
import PairingResults from '@/components/foodPairings/PairingResults.vue'
import { useFoodPairingsStore } from '@/stores/foodPairings'

defineOptions({
  name: 'PairingPage',
})

const route = useRoute()
const foodPairingsStore = useFoodPairingsStore()

const query = ref(typeof route.query.q === 'string' ? route.query.q : '')

onMounted(() => {
  // Eager prefetch only — a UX optimisation so the catalogue is often warm by the time the
  // user finishes typing. Correctness does not depend on it: search() awaits the same shared
  // promises itself, so a direct link, bookmark or refresh can never score an empty catalogue.
  // A failed prefetch is retried (and reported) by the search that needs it.
  foodPairingsStore.ensureAppellationsLoaded().catch(() => undefined)
  foodPairingsStore.loadVocabulary().catch(() => undefined)
})

// The dashboard teaser and shared links arrive as /pairing?q=…; the appellation page's
// "Pairs well with" chips arrive as /pairing?tags=slug,slug (exact tags, no text matching).
watch(
  () => [route.query.q, route.query.tags] as const,
  async ([q, tagSlugs]) => {
    if (typeof tagSlugs === 'string' && tagSlugs) {
      const slugs = new Set(tagSlugs.split(',').filter(Boolean))
      try {
        await foodPairingsStore.loadVocabulary()
      } catch {
        return // the prefetch's failure is reported by the next search the user runs
      }
      query.value = ''
      const ids = foodPairingsStore.tags.filter((tag) => slugs.has(tag.slug)).map((tag) => tag.id)
      void foodPairingsStore.searchByTags(ids)
    } else if (typeof q === 'string' && q.trim()) {
      query.value = q
      void foodPairingsStore.search(q)
    }
  },
  { immediate: true },
)
</script>

<template>
  <div>
    <EditorialHeader
      kicker="The Cellar · Pairing"
      title="Food &amp; wine"
      lede="Tell us what’s on the table — type a dish or pick from the lists — and we’ll suggest appellations to look for, and the bottles in your cellar that fit."
      :title-size="64"
      :lede-width="62"
    />
    <div class="rule-dbl mb-6 mt-6" />

    <FoodPairingSearch v-model:query="query" class="mb-10" />
    <PairingResults />
  </div>
</template>
