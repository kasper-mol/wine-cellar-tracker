<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
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
import { Slider } from '@/components/ui/slider'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import type { SettingsRecord } from '@/types/drinkingWindow'

const dwStore = useDrinkingWindowStore()
const { feedback, setSuccess, setError } = useFeedback()

const form = reactive<Partial<SettingsRecord>>({})

onMounted(async () => {
  try {
    await dwStore.loadConfig()
    if (dwStore.settings) Object.assign(form, dwStore.settings)
  } catch (e) {
    setError(e, 'Failed to load settings.')
  }
})

async function save() {
  try {
    await dwStore.saveSettings({ ...form })
    setSuccess('Settings saved.')
  } catch (e) {
    setError(e, 'Failed to save settings.')
  }
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
      <h1 class="text-3xl font-semibold tracking-tight">Calibration</h1>
      <p class="mt-1 text-muted-foreground">
        Fine-tune the formula that converts vintage scores and archetype time values into dated
        phase boundaries. Changes apply immediately to all computed windows — no migration needed.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <template v-if="form.id">
      <!-- Vintage score response -->
      <Card>
        <CardHeader>
          <CardTitle>Vintage score response</CardTitle>
          <CardDescription class="space-y-2">
            <span class="block">
              Archetype times (tStart/tPeak/tEnd) are defined at a <strong>neutral 90-pt vintage</strong>.
              For any actual vintage score the engine computes a quality delta:
              <code>Q = (score − midpoint) / divisor</code>,
              then shifts each boundary by <code>t × K × Q</code>.
            </span>
            <span class="block">
              Examples at midpoint=90, divisor=3:
              <strong>96 pts → Q = +2</strong> (great year, window pushed out significantly);
              <strong>90 pts → Q = 0</strong> (neutral, archetype times used as-is);
              <strong>84 pts → Q = −2</strong> (poor year, window pulled in).
            </span>
            <span class="block">
              Raising the divisor makes scores matter less (flatter response).
              Lowering it amplifies score differences. K-coefficients control how strongly
              each boundary (entry, peak, drink-by) responds — a higher k_end lets great
              vintages age much longer while leaving the entry date roughly unchanged.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid gap-6 md:grid-cols-3">
            <div class="space-y-3">
              <Label>k_start (enter coefficient): {{ form.k_start?.toFixed(2) }}</Label>
              <Slider
                :model-value="[form.k_start ?? 0]"
                :min="0"
                :max="0.5"
                :step="0.01"
                @update:model-value="form.k_start = ($event as number[])[0]"
              />
              <p class="text-xs text-muted-foreground">How much the entry date shifts with score.</p>
            </div>
            <div class="space-y-3">
              <Label>k_peak (peak coefficient): {{ form.k_peak?.toFixed(2) }}</Label>
              <Slider
                :model-value="[form.k_peak ?? 0]"
                :min="0"
                :max="0.5"
                :step="0.01"
                @update:model-value="form.k_peak = ($event as number[])[0]"
              />
              <p class="text-xs text-muted-foreground">How much the peak centre shifts.</p>
            </div>
            <div class="space-y-3">
              <Label>k_end (drink-by coefficient): {{ form.k_end?.toFixed(2) }}</Label>
              <Slider
                :model-value="[form.k_end ?? 0]"
                :min="0"
                :max="0.5"
                :step="0.01"
                @update:model-value="form.k_end = ($event as number[])[0]"
              />
              <p class="text-xs text-muted-foreground">How much the drink-by date shifts.</p>
            </div>
          </div>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <Label>Score midpoint</Label>
              <Input type="number" v-model.number="form.score_midpoint" />
              <p class="text-xs text-muted-foreground">Score at which Q = 0 (no shift). Default 90.</p>
            </div>
            <div class="space-y-2">
              <Label>Score divisor</Label>
              <Input type="number" v-model.number="form.score_divisor" min="1" />
              <p class="text-xs text-muted-foreground">Controls sensitivity to score deviations. Default 3.</p>
            </div>
            <div class="space-y-2">
              <Label>Default risk stance</Label>
              <Select v-model="form.risk_default">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">conservative (drink earlier)</SelectItem>
                  <SelectItem value="balanced">balanced (midpoint)</SelectItem>
                  <SelectItem value="push">push (drink later)</SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">Default applied when wine has no per-bottle stance.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Premox -->
      <Card>
        <CardHeader>
          <CardTitle>Premox cap (white wines)</CardTitle>
          <CardDescription>
            White Burgundy and other oxidation-prone whites are capped at a maximum age regardless
            of score. Wines made before the cutoff vintage and older than the age threshold trigger
            the cap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <Label>Cap (max years from vintage)</Label>
              <Input type="number" v-model.number="form.premox_cap_years" min="1" />
              <p class="text-xs text-muted-foreground">Drink-by is clamped to vintage + this value.</p>
            </div>
            <div class="space-y-2">
              <Label>Vintage cutoff year</Label>
              <Input type="number" v-model.number="form.premox_vintage_cutoff" />
              <p class="text-xs text-muted-foreground">Only vintages before this year are capped.</p>
            </div>
            <div class="space-y-2">
              <Label>Age threshold (yrs)</Label>
              <Input type="number" v-model.number="form.premox_age_years" min="1" />
              <p class="text-xs text-muted-foreground">Cap only triggered once wine exceeds this age.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Hot vintages factors -->
      <Card>
        <CardHeader>
          <CardTitle>Hot vintage factors</CardTitle>
          <CardDescription>
            Multipliers applied when a wine's vintage is listed in Hot vintages. Values less than 1
            shorten the window; 1.0 means no change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label>Drink-by factor: {{ form.hot_drinkby_factor }}</Label>
              <Slider
                :model-value="[form.hot_drinkby_factor ?? 0.85]"
                :min="0.5"
                :max="1"
                :step="0.05"
                @update:model-value="form.hot_drinkby_factor = ($event as number[])[0]"
              />
              <p class="text-xs text-muted-foreground">Shrinks the drink-by span. Default 0.85 = −15%.</p>
            </div>
            <div class="space-y-2">
              <Label>Peak factor: {{ form.hot_peak_factor }}</Label>
              <Slider
                :model-value="[form.hot_peak_factor ?? 0.9]"
                :min="0.5"
                :max="1"
                :step="0.05"
                @update:model-value="form.hot_peak_factor = ($event as number[])[0]"
              />
              <p class="text-xs text-muted-foreground">Compresses the peak window. Default 0.9 = −10%.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Producer extension -->
      <Card>
        <CardHeader>
          <CardTitle>Producer extension factors</CardTitle>
          <CardDescription>
            These values extend the drink-by date for wines from top producers. The extension is
            applied as a fraction of the full window span: <code>extension = span × factor</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid gap-4 md:grid-cols-3">
            <div class="space-y-2">
              <Label>Tier 5 factor</Label>
              <Input type="number" step="0.01" v-model.number="form.producer_ext_t5" />
              <p class="text-xs text-muted-foreground">Default 0.12 (+12%).</p>
            </div>
            <div class="space-y-2">
              <Label>Tier 4.5 factor</Label>
              <Input type="number" step="0.01" v-model.number="form.producer_ext_t45" />
              <p class="text-xs text-muted-foreground">Default 0.08 (+8%).</p>
            </div>
            <div class="space-y-2">
              <Label>Tier 4 factor</Label>
              <Input type="number" step="0.01" v-model.number="form.producer_ext_t4" />
              <p class="text-xs text-muted-foreground">Default 0.05 (+5%).</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-end">
        <Button @click="save">Save all settings</Button>
      </div>
    </template>

    <div v-else class="text-muted-foreground">Loading settings…</div>
  </div>
</template>
