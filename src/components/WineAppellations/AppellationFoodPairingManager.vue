<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FOOD_CATEGORIES } from '@/content/foodCategories'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type { FoodAffinity, FoodTagRecord } from '@/types/foodPairings'
import type { WineStyle } from '@/types/wineAppellations'

const props = defineProps<{
  appellationId: string | null
}>()

const foodPairingsStore = useFoodPairingsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { tags } = storeToRefs(foodPairingsStore)

/** The SAVED record, not the copy form's unsaved edits: the DB trigger validates an
 *  override's style against the stored `wine_styles`, so the picker must offer exactly those. */
const appellation = computed(() =>
  wineAppellationsStore.allAppellations.find((row) => row.id === props.appellationId),
)
const savedStyles = computed<WineStyle[]>(() => appellation.value?.wine_styles ?? [])

const style = ref<WineStyle | null>(null)
const feedback = ref<string | null>(null)
const busy = ref<Set<string>>(new Set())

watch(
  () => props.appellationId,
  (id) => {
    if (!id) return
    void foodPairingsStore.fetchForAppellation(id)
    if (!tags.value.length) void foodPairingsStore.loadVocabulary().catch(() => undefined)
  },
  { immediate: true },
)

// Keep the picker on a style the appellation really has (also after the styles are re-saved).
watch(
  savedStyles,
  (styles) => {
    if (!style.value || !styles.includes(style.value)) style.value = styles[0] ?? null
  },
  { immediate: true },
)

const rows = computed(() =>
  props.appellationId ? foodPairingsStore.forAppellation(props.appellationId) : [],
)

const rowByTag = computed(() => {
  const map = new Map<string, (typeof rows.value)[number]>()
  for (const row of rows.value) if (row.wine_style === style.value) map.set(row.food_tag_id, row)
  return map
})

const countByStyle = computed(() => {
  const map: Partial<Record<WineStyle, number>> = {}
  for (const row of rows.value) map[row.wine_style] = (map[row.wine_style] ?? 0) + 1
  return map
})

const tagsByCategory = computed(() =>
  FOOD_CATEGORIES.map((entry) => ({
    ...entry,
    tags: tags.value.filter((tag) => tag.category === entry.id),
  })).filter((entry) => entry.tags.length),
)

/** Click cycles: none → classic → good → clash → bad → none. */
const CYCLE: (FoodAffinity | null)[] = [null, 2, 1, -1, -2]
const AFFINITY_LABEL: Record<FoodAffinity, string> = {
  2: '+2',
  1: '+1',
  [-1]: '−1',
  [-2]: '−2',
}

function chipClass(affinity: FoodAffinity | undefined) {
  if (!affinity) return 'border-border text-foreground/70 hover:border-foreground/40'
  return affinity > 0
    ? 'border-primary bg-primary text-primary-foreground'
    : 'border-destructive bg-destructive/10 text-destructive'
}

async function cycle(tag: FoodTagRecord) {
  const editingStyle = style.value
  if (!props.appellationId || !editingStyle || busy.value.has(tag.id)) return
  feedback.value = null
  busy.value.add(tag.id)
  try {
    const existing = rowByTag.value.get(tag.id)
    const index = CYCLE.indexOf(existing?.affinity ?? null)
    const next = CYCLE[(index + 1) % CYCLE.length] ?? null
    if (existing) await foodPairingsStore.remove(existing)
    if (next !== null) {
      await foodPairingsStore.add({
        appellation_id: props.appellationId,
        wine_style: editingStyle,
        food_tag_id: tag.id,
        affinity: next,
      })
    }
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to update pairing.'
  } finally {
    busy.value.delete(tag.id)
  }
}
</script>

<template>
  <div v-if="appellationId" class="space-y-3 rounded-lg border border-border p-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-foreground">Food pairing overrides</p>
        <p class="text-xs text-muted-foreground">
          Per wine style, on top of the style baseline. Click a food to cycle classic&nbsp;+2 ·
          good&nbsp;+1 · clash&nbsp;−1 · bad&nbsp;−2 · off.
        </p>
      </div>
      <div v-if="savedStyles.length" class="w-44 space-y-1">
        <Label>Style</Label>
        <Select v-model="style">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="token in savedStyles" :key="token" :value="token">
              {{ wineStyleLabel(token) }}
              <span v-if="countByStyle[token]" class="text-muted-foreground">
                ({{ countByStyle[token] }})
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <p v-if="appellation?.food_pairings?.length" class="text-xs text-muted-foreground">
      <span class="font-medium text-foreground/70">Classic pairings (editorial):</span>
      {{ appellation.food_pairings.join(' · ') }}
    </p>

    <!-- Guard: no wine_styles saved yet, so no override can be valid (the DB trigger would reject it). -->
    <p
      v-if="!savedStyles.length"
      class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
    >
      Set this appellation's wine styles and save it before adding food-pairing overrides.
    </p>

    <template v-else>
      <div
        v-for="entry in tagsByCategory"
        :key="entry.id"
        class="grid grid-cols-[160px_1fr] gap-2 border-t border-border/60 py-1.5 max-sm:grid-cols-1"
      >
        <span class="text-xs text-foreground/[0.6]">{{ entry.label }}</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="tag in entry.tags"
            :key="tag.id"
            type="button"
            class="rounded-full border px-2 py-0.5 text-xs transition-colors"
            :class="chipClass(rowByTag.get(tag.id)?.affinity)"
            :disabled="busy.has(tag.id)"
            @click="cycle(tag)"
          >
            {{ tag.name }}
            <span v-if="rowByTag.get(tag.id)" class="ml-0.5 font-semibold">
              {{ AFFINITY_LABEL[rowByTag.get(tag.id)!.affinity] }}
            </span>
          </button>
        </div>
      </div>
    </template>

    <p v-if="feedback" class="text-sm text-destructive">{{ feedback }}</p>
  </div>
</template>
