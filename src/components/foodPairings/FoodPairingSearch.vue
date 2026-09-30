<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronDown, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Seg, SegOption } from '@/components/ui/seg'
import { FOOD_CATEGORIES } from '@/content/foodCategories'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type { DishPresetRecord, FoodTagCategory } from '@/types/foodPairings'

const query = defineModel<string>('query', { default: '' })

const foodPairingsStore = useFoodPairingsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { tags, dishPresets, isSearching, currentMatches, hasSearched, lastQuery } =
  storeToRefs(foodPairingsStore)

const builderOpen = ref(false)
const category = ref<FoodTagCategory>('protein')
/** The working tag set: what the chips highlight, whichever path produced it. */
const selectedIds = ref<string[]>([])

// Free text resolves to tags; mirror them so they show as chips and can be refined.
watch(currentMatches, (matches) => {
  selectedIds.value = matches.map((match) => match.tag.id)
})

// Nothing understood: open the category browser so the user isn't stuck.
watch([hasSearched, currentMatches, lastQuery], ([searched, matches, last]) => {
  if (searched && last && !matches.length) builderOpen.value = true
})

const tagsInCategory = computed(() => tags.value.filter((tag) => tag.category === category.value))

/** The first, cold-start search also has to fetch the appellation catalogue. */
const busyLabel = computed(() =>
  wineAppellationsStore.appellations.length === 0 ? 'Loading the wine catalogue…' : 'Searching…',
)

function submitText() {
  if (!query.value.trim() || isSearching.value) return
  void foodPairingsStore.search(query.value)
}

function isPresetActive(preset: DishPresetRecord) {
  const ids = new Set(selectedIds.value)
  return preset.foodTagIds.length === ids.size && preset.foodTagIds.every((id) => ids.has(id))
}

function applyPreset(preset: DishPresetRecord) {
  query.value = ''
  selectedIds.value = [...preset.foodTagIds]
  void foodPairingsStore.searchByTags(selectedIds.value)
}

function toggleTag(tagId: string) {
  selectedIds.value = selectedIds.value.includes(tagId)
    ? selectedIds.value.filter((id) => id !== tagId)
    : [...selectedIds.value, tagId]
  void foodPairingsStore.searchByTags(selectedIds.value)
}

const chipBase =
  'inline-flex min-h-8 items-center gap-1 rounded-full border px-3 py-1 text-[13px] transition-colors'
const chipOn = 'border-primary bg-primary/10 text-primary'
const chipOff = 'border-border text-foreground/70 hover:border-foreground/40'
</script>

<template>
  <section aria-label="Describe your dish">
    <form class="flex flex-wrap gap-2" role="search" @submit.prevent="submitText">
      <Input
        v-model="query"
        type="search"
        maxlength="200"
        placeholder="What are you eating? e.g. pan-seared salmon with lemon"
        class="min-w-0 flex-1 basis-[300px]"
        aria-label="Describe your dish"
      />
      <Button type="submit" :disabled="isSearching || !query.trim()" class="max-sm:w-full">
        {{ isSearching ? busyLabel : 'Find wines' }}
      </Button>
    </form>

    <div v-if="currentMatches.length" class="mt-4 flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        Understood as
      </span>
      <button
        v-for="match in currentMatches"
        :key="match.tag.id"
        type="button"
        :class="[chipBase, chipOn]"
        :title="
          match.confidence < 1 ? `Matched “${match.matchedPhrase}” loosely` : 'Click to remove'
        "
        :aria-label="`Remove ${match.tag.name}`"
        @click="toggleTag(match.tag.id)"
      >
        {{ match.tag.name }}
        <X class="h-3 w-3" :stroke-width="1.75" aria-hidden="true" />
      </button>
    </div>

    <div v-if="dishPresets.length" class="mt-5">
      <p class="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        Quick picks
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="preset in dishPresets"
          :key="preset.id"
          type="button"
          :class="[chipBase, isPresetActive(preset) ? chipOn : chipOff]"
          :aria-pressed="isPresetActive(preset)"
          @click="applyPreset(preset)"
        >
          {{ preset.label }}
        </button>
      </div>
    </div>

    <div class="mt-5">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-[13px] uppercase tracking-[0.06em] text-primary"
        :aria-expanded="builderOpen"
        aria-controls="food-builder"
        @click="builderOpen = !builderOpen"
      >
        Build your own
        <ChevronDown
          class="h-4 w-4 transition-transform"
          :class="builderOpen ? 'rotate-180' : ''"
          :stroke-width="1.5"
          aria-hidden="true"
        />
      </button>

      <div v-if="builderOpen" id="food-builder" class="mt-3">
        <Seg v-model="category" name="food-category" aria-label="Food category">
          <SegOption v-for="entry in FOOD_CATEGORIES" :key="entry.id" :value="entry.id">
            {{ entry.label }}
          </SegOption>
        </Seg>
        <div class="mt-3 flex flex-wrap gap-1.5">
          <button
            v-for="tag in tagsInCategory"
            :key="tag.id"
            type="button"
            :class="[chipBase, selectedIds.includes(tag.id) ? chipOn : chipOff]"
            :aria-pressed="selectedIds.includes(tag.id)"
            @click="toggleTag(tag.id)"
          >
            {{ tag.name }}
          </button>
          <p v-if="!tagsInCategory.length" class="text-sm text-foreground/[0.55]">
            Nothing here yet.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
