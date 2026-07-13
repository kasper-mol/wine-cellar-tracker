<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'

const dwStore = useDrinkingWindowStore()
const { archetypes, hotVintages } = storeToRefs(dwStore)
const { feedback, setSuccess, setError } = useFeedback()

const newHot = reactive<{ year: number | null; scope: string }>({ year: null, scope: 'all' })

onMounted(async () => {
  try {
    await dwStore.loadConfig()
  } catch (e) {
    setError(e, 'Failed to load hot vintages.')
  }
})

async function addHot() {
  if (newHot.year == null) return
  try {
    await dwStore.addHotVintage({ year: newHot.year, scope: newHot.scope.trim() || 'all' })
    newHot.year = null
    newHot.scope = 'all'
    setSuccess('Added hot vintage.')
  } catch (e) {
    setError(e, 'Failed to add hot vintage.')
  }
}

async function removeHot(id: string, year: number) {
  if (!window.confirm(`Remove ${year} from hot vintages?`)) return
  try {
    await dwStore.removeHotVintage(id)
    setSuccess(`Removed ${year}.`)
  } catch (e) {
    setError(e, 'Failed to remove hot vintage.')
  }
}

function scopeLabel(scope: string) {
  if (scope === 'all') return 'All archetypes'
  const archetype = archetypes.value.find((a) => a.key === scope)
  return archetype ? archetype.name : scope
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/manage/drinking-window"
        class="text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="inline h-4 w-4" /> Drinking-window engine
      </RouterLink>
    </div>

    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Hot vintages</h1>
      <p class="mt-1 text-muted-foreground">
        Some years produce wines that mature faster than the baseline model predicts. Flagging a
        vintage as "hot" applies compression factors:
      </p>
      <ul class="mt-2 space-y-0.5 text-sm text-muted-foreground">
        <li>
          <strong>Drink-by</strong> is multiplied by the
          <em>hot drink-by factor</em> (default 0.85) — shortening the window by ~15%.
        </li>
        <li>
          <strong>Peak window</strong> is compressed by the
          <em>hot peak factor</em> (default 0.9).
        </li>
        <li>A "hot vintage" note is added to the window's notes array.</li>
      </ul>
      <p class="mt-2 text-sm text-muted-foreground">
        <strong>Scope:</strong> use <code>all</code> to apply to every wine in that year, or enter
        an archetype <strong>key</strong> (e.g. <code>chiantiClassico</code>) to restrict to one
        wine type. Multiple rows with the same year but different scopes are supported.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <!-- Add form -->
    <Card>
      <CardHeader>
        <CardTitle>Add hot vintage</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label>Year</Label>
            <Input type="number" v-model.number="newHot.year" class="w-28" placeholder="e.g. 2003" />
          </div>
          <div class="space-y-2">
            <Label>Scope <span class="text-xs text-muted-foreground">"all" or archetype key</span></Label>
            <Input v-model="newHot.scope" class="w-52" placeholder="all" />
          </div>
          <Button @click="addHot">Add</Button>
        </div>
        <div v-if="archetypes.length" class="mt-3">
          <p class="mb-1 text-xs text-muted-foreground">Available archetype keys:</p>
          <div class="flex flex-wrap gap-1">
            <Badge
              v-for="a in archetypes"
              :key="a.key"
              variant="outline"
              class="cursor-pointer font-mono text-xs"
              @click="newHot.scope = a.key"
            >
              {{ a.key }}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- List -->
    <Card>
      <CardHeader>
        <CardTitle>
          Current hot vintages
          <span class="text-base font-normal text-muted-foreground">({{ hotVintages.length }})</span>
        </CardTitle>
        <CardDescription>Sorted newest first.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead class="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="h in hotVintages" :key="h.id">
              <TableCell class="font-medium">{{ h.year }}</TableCell>
              <TableCell>
                <span class="font-mono text-xs">{{ h.scope }}</span>
                <span class="ml-2 text-xs text-muted-foreground">{{ scopeLabel(h.scope) }}</span>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  @click="removeHot(h.id, h.year)"
                >
                  <Trash2 class="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow v-if="hotVintages.length === 0">
              <TableCell colspan="3" class="text-center text-muted-foreground">
                No hot vintages configured.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
