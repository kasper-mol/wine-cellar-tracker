<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import FoodTagForm from '@/components/foodPairings/FoodTagForm.vue'
import { FOOD_CATEGORIES, foodCategoryLabel } from '@/content/foodCategories'
import { useFeedback } from '@/composables/useFeedback'
import { blankTagForm, formToPayload, nextSortOrder, tagToForm } from '@/lib/foodTagForm'
import type { FoodTagFormState } from '@/lib/foodTagForm'
import { matchFoodTags } from '@/lib/foodTagMatcher'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { FoodTagRecord } from '@/types/foodPairings'

defineOptions({
  name: 'FoodPairingTagsPage',
})

const store = useFoodPairingsStore()
const { tags, phraseIndex, wineStyleFoodPairings, dishPresets } = storeToRefs(store)
const { feedback, setSuccess, setError } = useFeedback()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(async () => {
  try {
    await store.loadVocabulary()
    newForm.value = blankTagForm(nextSortOrder(tags.value))
  } catch (e) {
    setError(e, 'Failed to load food tags.')
  }
})

/* --- matcher tester: type a phrase, see exactly how the live vocabulary reads it --- */
const testInput = ref('')
const testMatches = computed(() =>
  testInput.value.trim() ? matchFoodTags(testInput.value, tags.value, phraseIndex.value) : [],
)

/* --- add --- */
const newForm = ref<FoodTagFormState>(blankTagForm(10))
const adding = ref(false)
const addKey = ref(0) // remounts the form so its "slug follows name" state resets

async function addTag() {
  const payload = formToPayload(newForm.value)
  if (!payload.name || !payload.slug) {
    setError(null, 'Name and slug are required.')
    return
  }
  adding.value = true
  try {
    const created = await store.addTag(payload)
    newForm.value = blankTagForm(nextSortOrder(tags.value))
    addKey.value++
    setSuccess(`Added “${created.name}”. Give it style pairings on the Style baseline page.`)
  } catch (e) {
    setError(e, 'Failed to add tag.')
  } finally {
    adding.value = false
  }
}

/* --- list --- */
const categoryFilter = ref('all')
const textFilter = ref('')

const filteredTags = computed(() => {
  const q = textFilter.value.trim().toLowerCase()
  return tags.value.filter(
    (tag) =>
      (categoryFilter.value === 'all' || tag.category === categoryFilter.value) &&
      (!q || tag.name.toLowerCase().includes(q) || tag.synonyms.some((s) => s.includes(q))),
  )
})

function synonymSummary(tag: FoodTagRecord) {
  const shown = tag.synonyms.slice(0, 6).join(', ')
  const rest = tag.synonyms.length - 6
  return rest > 0 ? `${shown} +${rest}` : shown
}

/* --- edit --- */
const editing = ref<FoodTagRecord | null>(null)
const editForm = ref<FoodTagFormState>(blankTagForm(10))
const editOpen = ref(false)
const saving = ref(false)

function openEdit(tag: FoodTagRecord) {
  editing.value = tag
  editForm.value = tagToForm(tag)
  editOpen.value = true
}

async function saveEdit() {
  const tag = editing.value
  if (!tag) return
  const { name, category, synonyms, sort_order } = formToPayload(editForm.value)
  const payload = { name, category, synonyms, sort_order } // the slug is a stable key: never updated
  if (!payload.name) {
    setError(null, 'Name is required.')
    return
  }
  saving.value = true
  try {
    await store.saveTag(tag.id, payload)
    editOpen.value = false
    setSuccess(`Saved “${payload.name}”.`)
  } catch (e) {
    setError(e, 'Failed to save tag.')
  } finally {
    saving.value = false
  }
}

/* --- delete --- */
async function removeTag(tag: FoodTagRecord) {
  const pairings = wineStyleFoodPairings.value.filter((row) => row.food_tag_id === tag.id).length
  const presets = dishPresets.value.filter((preset) => preset.foodTagIds.includes(tag.id)).length
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete food tag',
    body:
      `“${tag.name}” will be deleted together with its ${pairings} style pairing${pairings === 1 ? '' : 's'}, ` +
      `its links in ${presets} quick pick${presets === 1 ? '' : 's'}, and any appellation overrides that use it. ` +
      'This cannot be undone.',
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  try {
    await store.removeTag(tag.id)
    setSuccess(`Deleted “${tag.name}”.`)
  } catch (e) {
    setError(e, 'Failed to delete tag.')
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
      <h1 class="text-3xl font-semibold tracking-tight">Food tags</h1>
      <p class="mt-1 text-muted-foreground">
        The vocabulary a dish is described with — proteins, seafood, cooking styles, flavours,
        cuisines. Free text is matched against each tag’s name and synonyms, so one tag covers many
        phrasings. Aim for reusable concepts, not one tag per dish.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <Card>
      <CardHeader>
        <CardTitle>Try the matcher</CardTitle>
        <CardDescription>
          Type a dish to see how the live vocabulary reads it — exact phrases first, then typos on
          the remaining single words.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <Input v-model="testInput" placeholder="e.g. pan-seared salmon with a lemon butter sauce" />
        <ul v-if="testMatches.length" class="divide-y divide-border/60 text-sm">
          <li
            v-for="match in testMatches"
            :key="match.tag.id"
            class="flex flex-wrap items-baseline gap-x-3 py-1.5"
          >
            <span class="font-medium">{{ match.tag.name }}</span>
            <span class="text-xs text-muted-foreground">{{
              foodCategoryLabel(match.tag.category)
            }}</span>
            <span class="text-xs text-muted-foreground">
              “{{ match.matchedPhrase }}” ·
              {{ match.confidence === 1 ? 'exact' : `fuzzy ${match.confidence.toFixed(2)}` }}
            </span>
          </li>
        </ul>
        <p v-else-if="testInput.trim()" class="text-sm text-muted-foreground">
          Nothing matched — this is what users would see as “couldn’t pick out any ingredients”.
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Add tag</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <FoodTagForm :key="addKey" v-model="newForm" />
        <Button :disabled="adding" @click="addTag">{{ adding ? 'Adding…' : 'Add tag' }}</Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          All tags
          <span class="text-base font-normal text-muted-foreground">({{ tags.length }})</span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <Input v-model="textFilter" placeholder="Filter by name or synonym…" class="max-w-sm" />
          <Select v-model="categoryFilter">
            <SelectTrigger class="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem v-for="entry in FOOD_CATEGORIES" :key="entry.id" :value="entry.id">
                {{ entry.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-56">Name</TableHead>
              <TableHead class="w-40">Category</TableHead>
              <TableHead>Synonyms</TableHead>
              <TableHead class="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="tag in filteredTags" :key="tag.id">
              <TableCell class="font-medium">{{ tag.name }}</TableCell>
              <TableCell class="text-muted-foreground">{{
                foodCategoryLabel(tag.category)
              }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">{{ synonymSummary(tag) }}</TableCell>
              <TableCell class="whitespace-nowrap text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  :aria-label="`Edit ${tag.name}`"
                  @click="openEdit(tag)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  :aria-label="`Delete ${tag.name}`"
                  @click="removeTag(tag)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="filteredTags.length === 0">
              <TableCell colspan="4" class="text-center text-muted-foreground">
                {{ tags.length ? 'No tags match the filter.' : 'No tags yet.' }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="editOpen">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit food tag</DialogTitle>
      </DialogHeader>
      <FoodTagForm v-if="editing" v-model="editForm" :editing="editing" />
      <DialogFooter class="flex justify-end gap-2">
        <Button variant="outline" type="button" @click="editOpen = false">Cancel</Button>
        <Button type="button" :disabled="saving" @click="saveEdit">
          {{ saving ? 'Saving…' : 'Save' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <ConfirmDialog ref="confirmRef" />
</template>
