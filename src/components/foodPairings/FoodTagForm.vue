<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { FOOD_CATEGORIES } from '@/content/foodCategories'
import { findSynonymConflicts, parseSynonyms, slugify } from '@/lib/foodTagForm'
import type { FoodTagFormState } from '@/lib/foodTagForm'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { FoodTagCategory, FoodTagRecord } from '@/types/foodPairings'

const props = defineProps<{
  /** The tag being edited. Its slug is a stable key and cannot change. */
  editing?: FoodTagRecord | null
}>()

const form = defineModel<FoodTagFormState>({ required: true })

const { tags } = storeToRefs(useFoodPairingsStore())

/** Until the slug is touched by hand, it follows the name. */
const slugTouched = ref(false)

function patch(changes: Partial<FoodTagFormState>) {
  form.value = { ...form.value, ...changes }
}

function onName(name: string | number) {
  const value = String(name)
  patch(
    props.editing || slugTouched.value ? { name: value } : { name: value, slug: slugify(value) },
  )
}

function onSlug(slug: string | number) {
  slugTouched.value = true
  patch({ slug: slugify(String(slug)) })
}

const slugTaken = computed(
  () =>
    !props.editing && !!form.value.slug && tags.value.some((tag) => tag.slug === form.value.slug),
)

/** A shared phrase silently goes to whichever tag sorts first — surface it while editing. */
const conflicts = computed(() =>
  findSynonymConflicts(
    tags.value,
    form.value.name,
    parseSynonyms(form.value.synonyms),
    props.editing?.id ?? null,
  ),
)
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="space-y-2">
      <Label>Name</Label>
      <Input :model-value="form.name" placeholder="e.g. Goat cheese" @update:model-value="onName" />
    </div>

    <div class="space-y-2">
      <Label>Slug</Label>
      <Input
        :model-value="form.slug"
        :disabled="!!editing"
        placeholder="goat-cheese"
        @update:model-value="onSlug"
      />
      <p v-if="editing" class="text-xs text-muted-foreground">
        Fixed — the seed functions and shared links use it.
      </p>
      <p v-else-if="slugTaken" class="text-xs text-destructive">This slug already exists.</p>
    </div>

    <div class="space-y-2">
      <Label>Category</Label>
      <Select
        :model-value="form.category"
        @update:model-value="patch({ category: $event as FoodTagCategory })"
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="entry in FOOD_CATEGORIES" :key="entry.id" :value="entry.id">
            {{ entry.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label>Sort order</Label>
      <Input
        type="number"
        :model-value="form.sort_order"
        @update:model-value="patch({ sort_order: Number($event) })"
      />
      <p class="text-xs text-muted-foreground">
        Also the tie-break when a typo is equally close to two tags: the lower number wins.
      </p>
    </div>

    <div class="space-y-2 sm:col-span-2">
      <Label>Synonyms</Label>
      <Textarea
        :model-value="form.synonyms"
        rows="3"
        placeholder="goat cheese, chèvre, crottin"
        @update:model-value="patch({ synonyms: String($event) })"
      />
      <p class="text-xs text-muted-foreground">
        Comma or new-line separated, lowercase. Multi-word phrases match exactly, in order; single
        words also tolerate typos and plurals. The name is always matched too.
      </p>
      <ul v-if="conflicts.length" class="space-y-0.5 text-xs text-destructive">
        <li v-for="conflict in conflicts" :key="conflict.phrase">
          “{{ conflict.phrase }}” is already used by <strong>{{ conflict.tag.name }}</strong> — the
          earlier tag in the sort order will win it.
        </li>
      </ul>
    </div>
  </div>
</template>
