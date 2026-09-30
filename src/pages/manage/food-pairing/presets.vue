<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { FOOD_CATEGORIES } from '@/content/foodCategories'
import { useFeedback } from '@/composables/useFeedback'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { DishPresetRecord } from '@/types/foodPairings'

defineOptions({
  name: 'FoodPairingPresetsPage',
})

const store = useFoodPairingsStore()
const { tags, dishPresets } = storeToRefs(store)
const { feedback, setSuccess, setError } = useFeedback()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(async () => {
  try {
    await store.loadVocabulary()
  } catch (e) {
    setError(e, 'Failed to load quick picks.')
  }
})

const tagById = computed(() => new Map(tags.value.map((tag) => [tag.id, tag])))
const tagsByCategory = computed(() =>
  FOOD_CATEGORIES.map((entry) => ({
    ...entry,
    tags: tags.value.filter((tag) => tag.category === entry.id),
  })).filter((entry) => entry.tags.length),
)

/* --- add --- */
const newLabel = ref('')
const adding = ref(false)
/** The preset whose tag picker is open; a fresh one opens straight away. */
const openId = ref<string | null>(null)

async function addPreset() {
  const label = newLabel.value.trim()
  if (!label) return
  adding.value = true
  try {
    const sortOrder = dishPresets.value.reduce((max, p) => Math.max(max, p.sort_order), 0) + 10
    const created = await store.addPreset({ label, sort_order: sortOrder })
    newLabel.value = ''
    openId.value = created.id
    setSuccess(`Added “${label}” — now pick its tags.`)
  } catch (e) {
    setError(e, 'Failed to add quick pick.')
  } finally {
    adding.value = false
  }
}

/* --- edit label / order (saved on blur or enter) --- */
const drafts = reactive<Record<string, { label?: string; sort_order?: string }>>({})

async function saveDetails(preset: DishPresetRecord) {
  const draft = drafts[preset.id]
  if (!draft) return
  const label = (draft.label ?? preset.label).trim()
  const sortOrder = draft.sort_order === undefined ? preset.sort_order : Number(draft.sort_order)
  if (!label || !Number.isFinite(sortOrder)) {
    setError(null, 'A quick pick needs a label and a numeric order.')
    return
  }
  if (label === preset.label && sortOrder === preset.sort_order) {
    delete drafts[preset.id]
    return
  }
  try {
    await store.savePreset(preset.id, { label, sort_order: Math.trunc(sortOrder) })
    delete drafts[preset.id]
    setSuccess(`Saved “${label}”.`)
  } catch (e) {
    setError(e, 'Failed to save quick pick.')
  }
}

/* --- tags: every toggle persists straight away --- */
const busy = reactive(new Set<string>())

async function toggleTag(preset: DishPresetRecord, tagId: string) {
  if (busy.has(preset.id)) return
  busy.add(preset.id)
  try {
    const next = preset.foodTagIds.includes(tagId)
      ? preset.foodTagIds.filter((id) => id !== tagId)
      : [...preset.foodTagIds, tagId]
    await store.setPresetTags(preset.id, next)
  } catch (e) {
    setError(e, 'Failed to update tags.')
  } finally {
    busy.delete(preset.id)
  }
}

async function removePreset(preset: DishPresetRecord) {
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete quick pick',
    body: `“${preset.label}” will disappear from the pairing page. The food tags themselves are untouched.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  try {
    await store.removePreset(preset.id)
    setSuccess(`Deleted “${preset.label}”.`)
  } catch (e) {
    setError(e, 'Failed to delete quick pick.')
  }
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
      <h1 class="text-3xl font-semibold tracking-tight">Quick picks</h1>
      <p class="mt-1 text-muted-foreground">
        The tappable dishes on the pairing page (“Grilled salmon”, “Margherita pizza”). A quick pick
        is only a named bundle of food tags — it has no matching logic of its own, so the pairing
        page works fine with none. Lower order numbers come first.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <Card>
      <CardHeader>
        <CardTitle>Add quick pick</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label>Label</Label>
            <Input
              v-model="newLabel"
              placeholder="e.g. Roast lamb"
              class="w-64"
              @keyup.enter="addPreset"
            />
          </div>
          <Button :disabled="adding || !newLabel.trim()" @click="addPreset">Add</Button>
        </div>
      </CardContent>
    </Card>

    <Card v-for="preset in dishPresets" :key="preset.id">
      <CardContent class="space-y-3 pt-6">
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label>Label</Label>
            <Input
              :model-value="drafts[preset.id]?.label ?? preset.label"
              class="w-64"
              @update:model-value="(drafts[preset.id] ??= {}).label = String($event)"
              @blur="saveDetails(preset)"
              @keyup.enter="saveDetails(preset)"
            />
          </div>
          <div class="space-y-2">
            <Label>Order</Label>
            <Input
              type="number"
              :model-value="drafts[preset.id]?.sort_order ?? preset.sort_order"
              class="w-24"
              @update:model-value="(drafts[preset.id] ??= {}).sort_order = String($event)"
              @blur="saveDetails(preset)"
              @keyup.enter="saveDetails(preset)"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            @click="openId = openId === preset.id ? null : preset.id"
          >
            {{ openId === preset.id ? 'Done' : 'Edit tags' }}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            class="ml-auto text-destructive hover:text-destructive"
            :aria-label="`Delete ${preset.label}`"
            @click="removePreset(preset)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>

        <p v-if="!preset.foodTagIds.length" class="text-sm text-destructive">
          No tags yet — this quick pick would search for nothing.
        </p>
        <div v-else class="flex flex-wrap gap-1.5">
          <span
            v-for="tagId in preset.foodTagIds"
            :key="tagId"
            class="rounded-full border border-primary px-2.5 py-0.5 text-xs text-primary"
          >
            {{ tagById.get(tagId)?.name ?? '…' }}
          </span>
        </div>

        <div v-if="openId === preset.id" class="space-y-1 border-t border-border/60 pt-3">
          <div
            v-for="entry in tagsByCategory"
            :key="entry.id"
            class="grid grid-cols-[160px_1fr] gap-2 py-1 max-sm:grid-cols-1"
          >
            <span class="text-xs text-foreground/[0.6]">{{ entry.label }}</span>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tag in entry.tags"
                :key="tag.id"
                type="button"
                class="rounded-full border px-2 py-0.5 text-xs transition-colors"
                :class="
                  preset.foodTagIds.includes(tag.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground/70 hover:border-foreground/40'
                "
                :aria-pressed="preset.foodTagIds.includes(tag.id)"
                :disabled="busy.has(preset.id)"
                @click="toggleTag(preset, tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <p v-if="!dishPresets.length" class="text-sm text-muted-foreground">No quick picks yet.</p>
  </div>

  <ConfirmDialog ref="confirmRef" />
</template>
