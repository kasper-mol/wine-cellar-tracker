<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'

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
import { Slider } from '@/components/ui/slider'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'

import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type { ArchetypeRecord, CurveShape, SettingsRecord } from '@/types/drinkingWindow'

const dwStore = useDrinkingWindowStore()
const regionsStore = useWineRegionsStore()
const appellationsStore = useWineAppellationsStore()

const { archetypes, mappings, producerTiers, hotVintages } = storeToRefs(dwStore)
const { regions } = storeToRefs(regionsStore)
const { appellations } = storeToRefs(appellationsStore)
const { feedback, setSuccess, setError } = useFeedback()

const CURVES: CurveShape[] = ['earlyBell', 'standardBell', 'lateBell', 'twinPeak']
const NONE = '__none__'

// Local editable copies for the archetype table
const archetypeRows = ref<ArchetypeRecord[]>([])
const settingsForm = reactive<Partial<SettingsRecord>>({})

const newProducer = reactive<{ name: string; tier: string }>({ name: '', tier: '4' })
const newHot = reactive<{ year: number | null; scope: string }>({ year: null, scope: 'all' })

onMounted(async () => {
  try {
    await Promise.all([dwStore.loadConfig(true), regionsStore.loadAll(), appellationsStore.loadAll()])
    archetypeRows.value = archetypes.value.map((a) => ({ ...a }))
    if (dwStore.settings) Object.assign(settingsForm, dwStore.settings)
  } catch (e) {
    setError(e, 'Failed to load drinking-window config.')
  }
})

/* ----------------------------- settings ----------------------------- */
async function saveSettings() {
  try {
    await dwStore.saveSettings({ ...settingsForm })
    setSuccess('Settings saved.')
  } catch (e) {
    setError(e, 'Failed to save settings.')
  }
}

/* ----------------------------- archetypes ----------------------------- */
async function saveArchetype(row: ArchetypeRecord) {
  try {
    await dwStore.saveArchetype(row.id, {
      t_start: Number(row.t_start),
      t_peak: Number(row.t_peak),
      t_end: Number(row.t_end),
      curve: row.curve,
    })
    setSuccess(`Saved ${row.name}.`)
  } catch (e) {
    setError(e, 'Failed to save archetype.')
  }
}

/* ----------------------------- mappings ----------------------------- */
function appellationArchetype(appellationId: string): string {
  return mappings.value.find((m) => m.appellation_id === appellationId)?.archetype_id ?? NONE
}
function regionArchetype(regionId: string): string {
  return mappings.value.find((m) => m.region_id === regionId)?.archetype_id ?? NONE
}
async function onAssignAppellation(appellationId: string, value: string) {
  try {
    await dwStore.assignAppellation(appellationId, value === NONE ? null : value)
  } catch (e) {
    setError(e, 'Failed to set mapping.')
  }
}
async function onAssignRegion(regionId: string, value: string) {
  try {
    await dwStore.assignRegion(regionId, value === NONE ? null : value)
  } catch (e) {
    setError(e, 'Failed to set mapping.')
  }
}
const mappedAppellationCount = computed(
  () => appellations.value.filter((a) => appellationArchetype(a.id) !== NONE).length,
)

/* --------------------------- producer tiers --------------------------- */
async function addProducer() {
  const name = newProducer.name.trim()
  if (!name) return
  try {
    await dwStore.addProducerTier({ name, tier: Number(newProducer.tier) })
    newProducer.name = ''
    setSuccess(`Added ${name}.`)
  } catch (e) {
    setError(e, 'Failed to add producer.')
  }
}
async function changeProducerTier(id: string, value: string) {
  try {
    await dwStore.saveProducerTier(id, { tier: Number(value) })
  } catch (e) {
    setError(e, 'Failed to update tier.')
  }
}
async function removeProducer(id: string, name: string) {
  if (!window.confirm(`Remove ${name}?`)) return
  try {
    await dwStore.removeProducerTier(id)
  } catch (e) {
    setError(e, 'Failed to remove producer.')
  }
}

/* ---------------------------- hot vintages ---------------------------- */
async function addHot() {
  if (newHot.year == null) return
  try {
    await dwStore.addHotVintage({ year: newHot.year, scope: newHot.scope.trim() || 'all' })
    newHot.year = null
    newHot.scope = 'all'
  } catch (e) {
    setError(e, 'Failed to add hot vintage.')
  }
}
async function removeHot(id: string) {
  try {
    await dwStore.removeHotVintage(id)
  } catch (e) {
    setError(e, 'Failed to remove hot vintage.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Drinking-window engine</h1>
      <p class="text-muted-foreground">
        Tune the scoring tables behind the computed drink windows. Estimates are
        vintage/region-level, never bottle-specific.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <!-- Settings -->
    <Card v-if="settingsForm.id">
      <CardHeader>
        <CardTitle>Calibration</CardTitle>
        <CardDescription>Vintage coefficients and override knobs.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid gap-6 md:grid-cols-3">
          <div>
            <Label>enter coefficient (k_start): {{ settingsForm.k_start }}</Label>
            <Slider
              :model-value="[settingsForm.k_start ?? 0]"
              :min="0"
              :max="0.5"
              :step="0.01"
              @update:model-value="settingsForm.k_start = ($event as number[])[0]"
            />
          </div>
          <div>
            <Label>peak coefficient (k_peak): {{ settingsForm.k_peak }}</Label>
            <Slider
              :model-value="[settingsForm.k_peak ?? 0]"
              :min="0"
              :max="0.5"
              :step="0.01"
              @update:model-value="settingsForm.k_peak = ($event as number[])[0]"
            />
          </div>
          <div>
            <Label>drink-by coefficient (k_end): {{ settingsForm.k_end }}</Label>
            <Slider
              :model-value="[settingsForm.k_end ?? 0]"
              :min="0"
              :max="0.5"
              :step="0.01"
              @update:model-value="settingsForm.k_end = ($event as number[])[0]"
            />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Default risk stance</Label>
            <Select v-model="settingsForm.risk_default">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">conservative</SelectItem>
                <SelectItem value="balanced">balanced</SelectItem>
                <SelectItem value="push">push</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Score midpoint</Label>
            <Input type="number" v-model.number="settingsForm.score_midpoint" />
          </div>
          <div>
            <Label>Score divisor</Label>
            <Input type="number" v-model.number="settingsForm.score_divisor" />
          </div>
          <div>
            <Label>Premox cap (yrs)</Label>
            <Input type="number" v-model.number="settingsForm.premox_cap_years" />
          </div>
          <div>
            <Label>Premox vintage cutoff</Label>
            <Input type="number" v-model.number="settingsForm.premox_vintage_cutoff" />
          </div>
          <div>
            <Label>Premox age (yrs)</Label>
            <Input type="number" v-model.number="settingsForm.premox_age_years" />
          </div>
          <div>
            <Label>Hot drink-by factor</Label>
            <Input type="number" step="0.05" v-model.number="settingsForm.hot_drinkby_factor" />
          </div>
          <div>
            <Label>Hot peak factor</Label>
            <Input type="number" step="0.05" v-model.number="settingsForm.hot_peak_factor" />
          </div>
          <div>
            <Label>Producer ext (tier 5)</Label>
            <Input type="number" step="0.01" v-model.number="settingsForm.producer_ext_t5" />
          </div>
          <div>
            <Label>Producer ext (tier 4.5)</Label>
            <Input type="number" step="0.01" v-model.number="settingsForm.producer_ext_t45" />
          </div>
          <div>
            <Label>Producer ext (tier 4)</Label>
            <Input type="number" step="0.01" v-model.number="settingsForm.producer_ext_t4" />
          </div>
        </div>
        <div class="flex justify-end">
          <Button @click="saveSettings">Save settings</Button>
        </div>
      </CardContent>
    </Card>

    <!-- Archetypes -->
    <Card>
      <CardHeader>
        <CardTitle>Archetypes</CardTitle>
        <CardDescription>Years-from-vintage at a neutral (~90-pt) year.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archetype</TableHead>
              <TableHead>tStart</TableHead>
              <TableHead>tPeak</TableHead>
              <TableHead>tEnd</TableHead>
              <TableHead>Curve</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in archetypeRows" :key="row.id">
              <TableCell>{{ row.name }}</TableCell>
              <TableCell><Input type="number" v-model.number="row.t_start" class="w-20" /></TableCell>
              <TableCell><Input type="number" v-model.number="row.t_peak" class="w-20" /></TableCell>
              <TableCell><Input type="number" v-model.number="row.t_end" class="w-20" /></TableCell>
              <TableCell>
                <Select v-model="row.curve">
                  <SelectTrigger class="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="c in CURVES" :key="c" :value="c">{{ c }}</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="secondary" @click="saveArchetype(row)">Save</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Mappings -->
    <Card>
      <CardHeader>
        <CardTitle>Archetype mappings</CardTitle>
        <CardDescription>
          Assign an archetype to each appellation/region. Unmapped wines get no window.
          {{ mappedAppellationCount }}/{{ appellations.length }} appellations mapped.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div>
          <h3 class="mb-2 font-medium">Appellations</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appellation</TableHead>
                <TableHead>Archetype</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="app in appellations" :key="app.id">
                <TableCell>{{ app.name }}</TableCell>
                <TableCell>
                  <Select
                    :model-value="appellationArchetype(app.id)"
                    @update:model-value="onAssignAppellation(app.id, $event as string)"
                  >
                    <SelectTrigger class="w-64"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="NONE">— None —</SelectItem>
                      <SelectItem v-for="a in archetypes" :key="a.id" :value="a.id">
                        {{ a.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
          <h3 class="mb-2 font-medium">Regions (fallback)</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Archetype</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="region in regions" :key="region.id">
                <TableCell>{{ region.name }}</TableCell>
                <TableCell>
                  <Select
                    :model-value="regionArchetype(region.id)"
                    @update:model-value="onAssignRegion(region.id, $event as string)"
                  >
                    <SelectTrigger class="w-64"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem :value="NONE">— None —</SelectItem>
                      <SelectItem v-for="a in archetypes" :key="a.id" :value="a.id">
                        {{ a.name }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <!-- Producer tiers -->
    <Card>
      <CardHeader>
        <CardTitle>Producer tiers</CardTitle>
        <CardDescription>Higher tiers extend the back end of the window.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <Label>Producer</Label>
            <Input v-model="newProducer.name" placeholder="Producer name" />
          </div>
          <div>
            <Label>Tier</Label>
            <Select v-model="newProducer.tier">
              <SelectTrigger class="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="4.5">4.5</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button @click="addProducer">Add</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producer</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="p in producerTiers" :key="p.id">
              <TableCell>{{ p.name }}</TableCell>
              <TableCell>
                <Select
                  :model-value="String(p.tier)"
                  @update:model-value="changeProducerTier(p.id, $event as string)"
                >
                  <SelectTrigger class="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="4.5">4.5</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" @click="removeProducer(p.id, p.name)">✕</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <!-- Hot vintages -->
    <Card>
      <CardHeader>
        <CardTitle>Hot vintages</CardTitle>
        <CardDescription>
          Fast-maturing years. Scope is "all" or an archetype key (e.g. brunello).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <Label>Year</Label>
            <Input type="number" v-model.number="newHot.year" class="w-28" />
          </div>
          <div>
            <Label>Scope</Label>
            <Input v-model="newHot.scope" class="w-40" placeholder="all" />
          </div>
          <Button @click="addHot">Add</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="h in hotVintages" :key="h.id">
              <TableCell>{{ h.year }}</TableCell>
              <TableCell>{{ h.scope }}</TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" @click="removeHot(h.id)">✕</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
