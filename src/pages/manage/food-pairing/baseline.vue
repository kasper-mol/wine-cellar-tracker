<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Seg, SegOption } from '@/components/ui/seg'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { FOOD_CATEGORIES } from '@/content/foodCategories'
import { useFeedback } from '@/composables/useFeedback'
import { WINE_STYLE_TOKENS } from '@/lib/appellationCopyForm'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { FoodAffinity, FoodTagRecord } from '@/types/foodPairings'
import type { WineStyle } from '@/types/wineAppellations'

defineOptions({
  name: 'FoodPairingBaselinePage',
})

const store = useFoodPairingsStore()
const { tags, wineStyleFoodPairings } = storeToRefs(store)
const { feedback, setError } = useFeedback()

const style = ref<WineStyle>('red')
const busy = reactive(new Set<string>())
/** Unsaved note text, keyed by tag id, for the style on screen. */
const noteDrafts = reactive<Record<string, string>>({})

const AFFINITIES: FoodAffinity[] = [-2, -1, 1, 2]
const AFFINITY_TITLE: Record<FoodAffinity, string> = {
  [-2]: 'Clashes badly',
  [-1]: 'Mild clash',
  1: 'Good match',
  2: 'Classic match',
}
const affinityLabel = (value: FoodAffinity) => (value > 0 ? `+${value}` : `−${Math.abs(value)}`)

onMounted(async () => {
  try {
    await store.loadVocabulary()
  } catch (e) {
    setError(e, 'Failed to load the pairing vocabulary.')
  }
})

watch(style, () => {
  for (const key of Object.keys(noteDrafts)) delete noteDrafts[key]
})

const rowByTag = computed(
  () =>
    new Map(
      wineStyleFoodPairings.value
        .filter((row) => row.wine_style === style.value)
        .map((row) => [row.food_tag_id, row]),
    ),
)

const countByStyle = computed(() => {
  const counts: Partial<Record<WineStyle, number>> = {}
  for (const row of wineStyleFoodPairings.value) {
    counts[row.wine_style] = (counts[row.wine_style] ?? 0) + 1
  }
  return counts
})

const tagsByCategory = computed(() =>
  FOOD_CATEGORIES.map((entry) => ({
    ...entry,
    tags: tags.value.filter((tag) => tag.category === entry.id),
  })).filter((entry) => entry.tags.length),
)

async function run(tag: FoodTagRecord, action: () => Promise<unknown>, fallback: string) {
  if (busy.has(tag.id)) return
  busy.add(tag.id)
  try {
    await action()
  } catch (e) {
    setError(e, fallback)
  } finally {
    busy.delete(tag.id)
  }
}

/** Clicking the active value again clears the claim ("no row = not curated, not bad"). */
function setAffinity(tag: FoodTagRecord, affinity: FoodAffinity) {
  const existing = rowByTag.value.get(tag.id)
  return run(
    tag,
    async () => {
      if (existing?.affinity === affinity) {
        await store.removeBaseline(existing)
        delete noteDrafts[tag.id]
      } else {
        await store.saveBaseline({
          wine_style: style.value,
          food_tag_id: tag.id,
          affinity,
          note: noteDrafts[tag.id]?.trim() || existing?.note || null,
        })
      }
    },
    'Failed to save pairing.',
  )
}

function saveNote(tag: FoodTagRecord) {
  const existing = rowByTag.value.get(tag.id)
  const draft = noteDrafts[tag.id]
  if (!existing || draft === undefined || draft.trim() === (existing.note ?? '')) return
  return run(
    tag,
    async () => {
      await store.saveBaseline({
        wine_style: existing.wine_style,
        food_tag_id: tag.id,
        affinity: existing.affinity,
        note: draft.trim() || null,
      })
      delete noteDrafts[tag.id]
    },
    'Failed to save note.',
  )
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/manage/food-pairing"
        class="text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="inline h-4 w-4" /> Food pairing
      </RouterLink>
    </div>

    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Style baseline</h1>
      <p class="mt-1 text-muted-foreground">
        How each wine <strong>style</strong> sits with each food tag. This is what gives every
        appellation a recommendation, before anyone curates it individually. Pick a style, then rate
        the foods:
      </p>
      <ul class="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <li><strong>+2</strong> classic match · <strong>+1</strong> good match</li>
        <li><strong>−1</strong> mild clash · <strong>−2</strong> clashes badly</li>
        <li>
          <strong>No rating</strong> means “not curated”, not “bad”. Click the active rating again
          to clear it.
        </li>
      </ul>
      <p class="mt-2 text-sm text-muted-foreground">
        Pairing theory to lean on: acid cuts fat, tannin wants protein and fat, sweetness balances
        spice and salt, and body should match weight.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <Seg v-model="style" name="baseline-style" aria-label="Wine style">
      <SegOption v-for="token in WINE_STYLE_TOKENS" :key="token" :value="token">
        {{ wineStyleLabel(token) }}
        <span class="text-muted-foreground">({{ countByStyle[token] ?? 0 }})</span>
      </SegOption>
    </Seg>

    <Card v-for="entry in tagsByCategory" :key="entry.id">
      <CardHeader>
        <CardTitle class="text-lg">{{ entry.label }}</CardTitle>
      </CardHeader>
      <CardContent class="divide-y divide-border/60">
        <div
          v-for="tag in entry.tags"
          :key="tag.id"
          class="grid grid-cols-[190px_auto_1fr] items-center gap-3 py-2 max-md:grid-cols-1 max-md:gap-1.5"
        >
          <span class="text-sm font-medium">{{ tag.name }}</span>

          <div
            class="inline-flex overflow-hidden rounded-md border border-border"
            role="group"
            :aria-label="`${tag.name} affinity for ${wineStyleLabel(style)}`"
          >
            <button
              v-for="value in AFFINITIES"
              :key="value"
              type="button"
              class="min-w-9 border-l border-border px-2.5 py-1 text-[13px] transition-colors first:border-l-0 disabled:opacity-45"
              :class="
                rowByTag.get(tag.id)?.affinity === value
                  ? value > 0
                    ? 'bg-primary/15 font-semibold text-primary'
                    : 'bg-destructive/15 font-semibold text-destructive'
                  : 'text-foreground/70 hover:bg-foreground/[0.07]'
              "
              :title="AFFINITY_TITLE[value]"
              :aria-pressed="rowByTag.get(tag.id)?.affinity === value"
              :disabled="busy.has(tag.id)"
              @click="setAffinity(tag, value)"
            >
              {{ affinityLabel(value) }}
            </button>
          </div>

          <Input
            :model-value="noteDrafts[tag.id] ?? rowByTag.get(tag.id)?.note ?? ''"
            :disabled="!rowByTag.get(tag.id) || busy.has(tag.id)"
            :placeholder="
              rowByTag.get(tag.id) ? 'Why? (optional one-liner)' : 'Rate it to add a note'
            "
            @update:model-value="noteDrafts[tag.id] = String($event)"
            @blur="saveNote(tag)"
            @keyup.enter="saveNote(tag)"
          />
        </div>
      </CardContent>
    </Card>

    <p v-if="!tags.length" class="text-sm text-muted-foreground">
      No food tags yet — add some on the Food tags page first.
    </p>
  </div>
</template>
