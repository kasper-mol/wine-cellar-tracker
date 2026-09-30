<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { findSynonymConflicts } from '@/lib/foodTagForm'
import { useFoodPairingsStore } from '@/stores/foodPairings'
import type { UnmatchedQuery } from '@/lib/foodSearchBacklog'

defineOptions({
  name: 'FoodPairingSearchesPage',
})

const store = useFoodPairingsStore()
const { tags, unmatchedQueries, searchQueriesLoading } = storeToRefs(store)
const { feedback, setSuccess, setError } = useFeedback()

/** Per-row edit state: the phrase to add (defaults to the query) and the tag it goes to. */
const drafts = reactive<Record<string, { phrase?: string; tagId?: string }>>({})

const tagOptions = computed(() => [...tags.value].sort((a, b) => a.name.localeCompare(b.name)))

async function load() {
  try {
    await store.loadVocabulary()
    await store.loadSearchQueries()
  } catch (e) {
    setError(e, 'Failed to load search queries.')
  }
}

onMounted(load)

const busy = ref<string | null>(null)

async function addSynonym(entry: UnmatchedQuery) {
  const draft = drafts[entry.query]
  const tag = tags.value.find((t) => t.id === draft?.tagId)
  const phrase = (draft?.phrase ?? entry.query).trim().toLowerCase()
  if (!tag || !phrase) {
    setError(null, 'Pick a tag and a phrase first.')
    return
  }
  const conflict = findSynonymConflicts(tags.value, '', [phrase], tag.id)[0]
  if (conflict) {
    setError(null, `“${phrase}” is already used by ${conflict.tag.name}.`)
    return
  }
  busy.value = entry.query
  try {
    await store.saveTag(tag.id, { synonyms: [...new Set([...tag.synonyms, phrase])] })
    delete drafts[entry.query]
    setSuccess(`“${phrase}” now matches ${tag.name}.`)
  } catch (e) {
    setError(e, 'Failed to add synonym.')
  } finally {
    busy.value = null
  }
}

async function dismiss(entry: UnmatchedQuery) {
  busy.value = entry.query
  try {
    await store.dismissSearchQueries(entry.ids)
    setSuccess(`Dismissed “${entry.query}”.`)
  } catch (e) {
    setError(e, 'Failed to dismiss query.')
  } finally {
    busy.value = null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
      <h1 class="text-3xl font-semibold tracking-tight">Unmatched searches</h1>
      <p class="mt-1 text-muted-foreground">
        What people typed that the vocabulary couldn’t read, most-asked first. This is how the
        vocabulary grows from real use: add the phrase as a synonym of an existing tag, or add a new
        tag on the Food tags page. An entry disappears by itself once the vocabulary matches it;
        dismiss junk to delete it.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <Card>
      <CardHeader>
        <CardTitle>
          Backlog
          <span class="text-base font-normal text-muted-foreground">
            ({{ unmatchedQueries.length }})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <Button variant="secondary" size="sm" :disabled="searchQueriesLoading" @click="load">
          {{ searchQueriesLoading ? 'Loading…' : 'Refresh' }}
        </Button>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Search</TableHead>
              <TableHead class="w-16">Times</TableHead>
              <TableHead class="w-32">Last seen</TableHead>
              <TableHead>Add as synonym of</TableHead>
              <TableHead class="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="entry in unmatchedQueries" :key="entry.query">
              <TableCell class="font-medium">{{ entry.query }}</TableCell>
              <TableCell>{{ entry.count }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDate(entry.lastSeen) }}</TableCell>
              <TableCell>
                <div class="flex flex-wrap items-center gap-2">
                  <Input
                    :model-value="drafts[entry.query]?.phrase ?? entry.query"
                    class="w-44"
                    aria-label="Phrase to add"
                    @update:model-value="(drafts[entry.query] ??= {}).phrase = String($event)"
                  />
                  <Select
                    :model-value="drafts[entry.query]?.tagId"
                    @update:model-value="(drafts[entry.query] ??= {}).tagId = $event as string"
                  >
                    <SelectTrigger class="w-48"
                      ><SelectValue placeholder="Pick a tag"
                    /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="tag in tagOptions" :key="tag.id" :value="tag.id">
                        {{ tag.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    :disabled="busy === entry.query || !drafts[entry.query]?.tagId"
                    @click="addSynonym(entry)"
                  >
                    Add
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  :disabled="busy === entry.query"
                  :aria-label="`Dismiss ${entry.query}`"
                  @click="dismiss(entry)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="unmatchedQueries.length === 0">
              <TableCell colspan="5" class="text-center text-muted-foreground">
                {{
                  searchQueriesLoading
                    ? 'Loading…'
                    : 'Nothing unmatched — the vocabulary covers what people asked.'
                }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
