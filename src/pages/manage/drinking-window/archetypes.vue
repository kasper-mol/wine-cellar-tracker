<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import type { ArchetypeRecord, CurveShape } from '@/types/drinkingWindow'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const dwStore = useDrinkingWindowStore()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const { archetypes } = storeToRefs(dwStore)
const { feedback, setSuccess, setError } = useFeedback()

const CURVES: CurveShape[] = ['earlyBell', 'standardBell', 'lateBell', 'twinPeak']

const archetypeRows = ref<ArchetypeRecord[]>([])

const blank = () => ({
  key: '',
  name: '',
  t_start: 2,
  t_peak: 6,
  t_end: 12,
  curve: 'standardBell' as CurveShape,
})
const newForm = reactive(blank())
const adding = ref(false)

onMounted(async () => {
  try {
    await dwStore.loadConfig()
    archetypeRows.value = archetypes.value.map((a) => ({ ...a }))
  } catch (e) {
    setError(e, 'Failed to load archetypes.')
  }
})

async function saveRow(row: ArchetypeRecord) {
  try {
    await dwStore.saveArchetype(row.id, {
      name: row.name,
      t_start: Number(row.t_start),
      t_peak: Number(row.t_peak),
      t_end: Number(row.t_end),
      curve: row.curve,
    })
    setSuccess(`Saved "${row.name}".`)
  } catch (e) {
    setError(e, 'Failed to save archetype.')
  }
}

async function deleteRow(row: ArchetypeRecord) {
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete archetype',
    body: `“${row.name}” and every appellation or region mapping using it will be removed. This cannot be undone.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return
  try {
    await dwStore.removeArchetype(row.id)
    archetypeRows.value = archetypeRows.value.filter((r) => r.id !== row.id)
    setSuccess(`Deleted "${row.name}".`)
  } catch (e) {
    setError(e, 'Failed to delete archetype.')
  }
}

async function addArchetype() {
  if (!newForm.key.trim() || !newForm.name.trim()) {
    setError(null, 'Key and name are required.')
    return
  }
  adding.value = true
  try {
    const created = await dwStore.addArchetype({
      key: newForm.key.trim(),
      name: newForm.name.trim(),
      t_start: Number(newForm.t_start),
      t_peak: Number(newForm.t_peak),
      t_end: Number(newForm.t_end),
      curve: newForm.curve,
    })
    archetypeRows.value = [...archetypeRows.value, { ...created }].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    Object.assign(newForm, blank())
    setSuccess(`Added "${created.name}".`)
  } catch (e) {
    setError(e, 'Failed to add archetype.')
  } finally {
    adding.value = false
  }
}

/* SVG paths for each curve shape (viewBox 0 0 120 50) */
const CURVE_SVG: Record<CurveShape, string> = {
  earlyBell: 'M 0 48 C 5 48 12 2 28 2 C 44 2 60 22 120 48 Z',
  standardBell: 'M 0 48 C 18 48 32 2 60 2 C 88 2 102 48 120 48 Z',
  lateBell: 'M 0 48 C 15 48 45 46 62 22 C 74 6 88 2 105 2 C 113 2 117 22 120 48 Z',
  twinPeak: 'M 0 48 C 7 48 16 2 28 2 C 40 2 46 34 58 34 C 70 34 76 2 90 2 C 104 2 112 48 120 48 Z',
}

const CURVE_LABELS: Record<CurveShape, string> = {
  earlyBell: 'Peaks early, long decline — white Burgundy, Champagne',
  standardBell: 'Symmetric peak — versatile mid-range reds',
  lateBell: 'Late peak, quick close — Barolo, Bordeaux classed growths',
  twinPeak: 'Two windows — some Burgundy pinot, Hermitage',
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
      <h1 class="text-3xl font-semibold tracking-tight">Archetypes</h1>
      <p class="mt-1 text-muted-foreground">
        An archetype defines the underlying aging curve for a wine type. The three time values are
        <strong>years after vintage</strong> calibrated to a
        <strong>neutral 90-point vintage</strong>: <em>tStart</em> = earliest drinkable,
        <em>tPeak</em> = prime window centre, <em>tEnd</em> = drink-by deadline.
      </p>
      <div
        class="mt-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1"
      >
        <p>
          <strong class="text-foreground">What "neutral 90-point" means:</strong>
          The archetype times assume the vintage scored exactly 90 pts — a solid but unremarkable
          year. For any other score the engine applies a quality delta:
          <code class="rounded bg-muted px-1">Q = (score − 90) / 3</code>. A 93-pt vintage gives Q =
          +1, shifting all three boundaries later by roughly 1× the K-coefficient. A 87-pt vintage
          gives Q = −1, pulling them earlier. A truly great vintage (96 pts, Q ≈ +2) can add several
          years to the window; a poor one (84 pts, Q ≈ −2) can shorten it noticeably.
        </p>
        <p>
          The midpoint (90) and divisor (3) are tunable in
          <RouterLink to="/manage/drinking-window/settings" class="underline hover:text-foreground"
            >Calibration</RouterLink
          >.
        </p>
      </div>
    </div>

    <!-- Curve shape guide -->
    <Card>
      <CardHeader>
        <CardTitle>Curve shapes</CardTitle>
        <CardDescription>
          The curve affects how quality is distributed across the window — it does not change the
          entry/peak/end dates themselves, only the visual representation and future priority
          sorting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="curve in CURVES" :key="curve" class="space-y-2">
            <p class="text-sm font-medium">{{ curve }}</p>
            <svg viewBox="0 0 120 50" class="w-full rounded border bg-muted/30" aria-hidden="true">
              <path
                :d="CURVE_SVG[curve]"
                fill="hsl(var(--primary) / 0.25)"
                stroke="hsl(var(--primary))"
                stroke-width="1.5"
              />
            </svg>
            <p class="text-xs text-muted-foreground">{{ CURVE_LABELS[curve] }}</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <FeedbackBanner :feedback="feedback" />

    <!-- Archetypes table -->
    <Card>
      <CardHeader>
        <CardTitle>All archetypes</CardTitle>
        <CardDescription
          >Edit inline and save per row. Delete removes all associated mappings.</CardDescription
        >
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead
                class="w-20 cursor-help"
                title="tStart — years after vintage when the wine first becomes drinkable at a neutral 90-pt score. Higher scores push this later; lower scores pull it earlier."
                >tStart ⓘ</TableHead
              >
              <TableHead
                class="w-20 cursor-help"
                title="tPeak — years after vintage at the centre of the prime drinking window. The engine calculates peakStart and peakEnd symmetrically around this point."
                >tPeak ⓘ</TableHead
              >
              <TableHead
                class="w-20 cursor-help"
                title="tEnd — years after vintage when the wine should be finished (drink-by). Beyond this the engine marks the wine Past prime."
                >tEnd ⓘ</TableHead
              >
              <TableHead>Curve</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in archetypeRows" :key="row.id">
              <TableCell>
                <Input v-model="row.name" class="w-44" />
              </TableCell>
              <TableCell class="font-mono text-xs text-muted-foreground">{{ row.key }}</TableCell>
              <TableCell>
                <Input type="number" v-model.number="row.t_start" class="w-20" min="0" />
              </TableCell>
              <TableCell>
                <Input type="number" v-model.number="row.t_peak" class="w-20" min="0" />
              </TableCell>
              <TableCell>
                <Input type="number" v-model.number="row.t_end" class="w-20" min="0" />
              </TableCell>
              <TableCell>
                <Select v-model="row.curve">
                  <SelectTrigger class="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="c in CURVES" :key="c" :value="c">{{ c }}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button size="sm" variant="secondary" @click="saveRow(row)">Save</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    class="text-destructive hover:text-destructive"
                    @click="deleteRow(row)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Add new archetype -->
    <Card>
      <CardHeader>
        <CardTitle>Add archetype</CardTitle>
        <CardDescription>
          The key is a stable internal identifier (camelCase slug, e.g. "myCustomRed"). It cannot be
          changed after creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="space-y-2">
            <Label
              >Key <span class="text-xs text-muted-foreground">(camelCase, unique)</span></Label
            >
            <Input v-model="newForm.key" placeholder="e.g. myCustomRed" />
          </div>
          <div class="space-y-2">
            <Label>Display name</Label>
            <Input v-model="newForm.name" placeholder="e.g. My Custom Red" />
          </div>
          <div class="space-y-2">
            <Label>Curve</Label>
            <Select v-model="newForm.curve">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in CURVES" :key="c" :value="c">{{ c }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label
              title="Years after vintage when the wine first becomes drinkable at a neutral 90-pt score."
            >
              tStart (yrs) ⓘ
            </Label>
            <Input type="number" v-model.number="newForm.t_start" min="0" />
          </div>
          <div class="space-y-2">
            <Label title="Years after vintage at the centre of the prime drinking window.">
              tPeak (yrs) ⓘ
            </Label>
            <Input type="number" v-model.number="newForm.t_peak" min="0" />
          </div>
          <div class="space-y-2">
            <Label
              title="Years after vintage when the wine should be finished. Beyond this it is marked Past prime."
            >
              tEnd (yrs) ⓘ
            </Label>
            <Input type="number" v-model.number="newForm.t_end" min="0" />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <Button :disabled="adding" @click="addArchetype">
            {{ adding ? 'Adding…' : 'Add archetype' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
  <ConfirmDialog ref="confirmRef" />
</template>
