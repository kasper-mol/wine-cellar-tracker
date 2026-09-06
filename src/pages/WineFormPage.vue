<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { watchDebounced } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Seg, SegOption } from '@/components/ui/seg'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useMainStore } from '@/stores/main'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import type { DrinkingWindow } from '@/types/drinkingWindow'
import type { UserWine, WineCreatePayload, WineStyle } from '@/types/wines'

defineOptions({
  name: 'WineFormPage',
})

const STYLES: { value: WineStyle; label: string }[] = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rosé', label: 'Rosé' },
  { value: 'sparkling', label: 'Sparkling' },
  { value: 'dessert', label: 'Dessert' },
]

const route = useRoute()
const router = useRouter()
const mainStore = useMainStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const drinkingWindowStore = useDrinkingWindowStore()
const { feedback, setError, clearFeedback } = useFeedback()

const { userWines } = storeToRefs(mainStore)
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)

const editingId = computed(() => (route.params.id as string | undefined) ?? null)
const isEditing = computed(() => editingId.value !== null)
const isSaving = ref(false)

const blank = () => ({
  name: '',
  producer: '',
  vintage: '',
  quantity: '1',
  regionId: '',
  appellationId: '',
  style: '' as '' | WineStyle,
  rating: '',
  purchasePrice: '',
  readyToDrink: '',
  criticStart: '',
  criticEnd: '',
  varietal: '',
  vivinoLink: '',
})

const form = reactive(blank())

const appellationsForRegion = computed(() =>
  form.regionId ? appellations.value.filter((a) => a.region_id === form.regionId) : [],
)

function onRegionChange() {
  // drop the appellation if it no longer belongs to the chosen region
  if (!appellationsForRegion.value.some((a) => a.id === form.appellationId)) {
    form.appellationId = ''
  }
}

function fillFrom(wine: UserWine) {
  form.name = wine.name
  form.producer = wine.producer
  form.vintage = wine.vintage ? String(wine.vintage) : ''
  form.quantity = String(wine.quantity ?? 1)
  form.regionId = wine.regionId ?? ''
  form.appellationId = wine.appellationId ?? ''
  form.style = wine.style ?? ''
  form.rating = wine.rating ? String(wine.rating) : ''
  form.purchasePrice = wine.purchasePrice ? String(wine.purchasePrice) : ''
  form.readyToDrink = wine.readyToDrink
  form.criticStart = wine.criticWindowStart ? String(wine.criticWindowStart) : ''
  form.criticEnd = wine.criticWindowEnd ? String(wine.criticWindowEnd) : ''
  form.varietal = wine.varietal
  form.vivinoLink = wine.vivinoLink
}

onMounted(async () => {
  await Promise.all([
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
    drinkingWindowStore.loadConfig(),
    userWines.value.length ? Promise.resolve() : mainStore.loadWines(),
  ])

  if (editingId.value) {
    const wine = userWines.value.find((w) => w.id === editingId.value)
    if (wine) fillFrom(wine)
  }
  recomputeWindow()
})

/* ------------------- the live computed-window aside ------------------- */

const num = (v: string) => (v.trim() === '' ? null : Number(v))
const computedWindow = shallowRef<DrinkingWindow | null>(null)

/** A draft cellar wine, good enough for the engine to read. */
function draftWine(): UserWine {
  const region = regions.value.find((r) => r.id === form.regionId)
  const appellation = appellations.value.find((a) => a.id === form.appellationId)
  return {
    id: editingId.value ?? 'draft',
    name: form.name,
    producer: form.producer,
    varietal: form.varietal,
    vintage: Number(form.vintage) || 0,
    style: (form.style || 'red') as WineStyle,
    quantity: Number(form.quantity) || 0,
    rating: Number(form.rating) || 0,
    readyToDrink: form.readyToDrink,
    criticWindowStart: num(form.criticStart),
    criticWindowEnd: num(form.criticEnd),
    purchasePrice: Number(form.purchasePrice) || 0,
    vivinoLink: form.vivinoLink,
    regionId: form.regionId || null,
    regionName: region?.name ?? '',
    appellationId: form.appellationId || null,
    appellationName: appellation?.name ?? '',
    cuvee: null,
    predikatLevel: null,
    sweetness: null,
    juraStyle: null,
    friuliStyle: null,
    champagneType: null,
    disgorgementDate: null,
  }
}

function recomputeWindow() {
  computedWindow.value = drinkingWindowStore.computeWindow(draftWine())
}

watchDebounced(() => ({ ...form }), recomputeWindow, { debounce: 200 })

/* ------------------------------ submit ------------------------------- */

function buildPayload(name: string): WineCreatePayload {
  return {
    name,
    producer: form.producer.trim() || null,
    varietal: form.varietal.trim() || null,
    vintage: num(form.vintage),
    style: form.style || null,
    quantity: form.quantity.trim() === '' ? 1 : Number(form.quantity),
    rating: num(form.rating),
    ready_to_drink: form.readyToDrink.trim() || null,
    critic_window_start: num(form.criticStart),
    critic_window_end: num(form.criticEnd),
    purchase_price: num(form.purchasePrice),
    vivino_link: form.vivinoLink.trim() || null,
    region: form.regionId || null,
    appellation: form.appellationId || null,
  }
}

async function handleSubmit(addAnother = false) {
  const name = form.name.trim()
  if (!name) {
    setError(null, 'Wine name is required.')
    return
  }

  isSaving.value = true
  clearFeedback()
  try {
    if (editingId.value) {
      await mainStore.editWine(editingId.value, buildPayload(name))
    } else {
      await mainStore.addWine(buildPayload(name))
    }
    if (addAnother) {
      Object.assign(form, blank())
      recomputeWindow()
    } else {
      router.push('/')
    }
  } catch (error) {
    setError(error, 'Failed to save wine.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <EditorialHeader
      kicker="Cellar entry"
      :title="isEditing ? 'Edit a wine' : 'Add a wine'"
      :title-size="56"
    />
    <div class="rule-dbl mb-6 mt-3" />

    <form
      class="grid grid-cols-[1fr_360px] items-start gap-8 max-lg:grid-cols-1"
      @submit.prevent="handleSubmit(false)"
    >
      <div class="flex flex-col gap-6">
        <fieldset class="m-0 border-0 p-0">
          <legend
            class="mb-3 w-full border-b border-border pb-1.5 font-heading text-[13px] uppercase tracking-[0.14em] text-accent-700"
          >
            The label
          </legend>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 max-sm:grid-cols-1">
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Wine name</Label>
              <Input v-model="form.name" placeholder="e.g. Barolo Cerequio" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Producer</Label>
              <Input v-model="form.producer" placeholder="e.g. Roberto Voerzio" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Vintage</Label>
              <Input v-model="form.vintage" type="number" placeholder="e.g. 2016 — blank for NV" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Grape(s)</Label>
              <Input v-model="form.varietal" placeholder="e.g. Nebbiolo" />
            </div>
          </div>
        </fieldset>

        <fieldset class="m-0 border-0 p-0">
          <legend
            class="mb-3 w-full border-b border-border pb-1.5 font-heading text-[13px] uppercase tracking-[0.14em] text-accent-700"
          >
            Origin
          </legend>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 max-sm:grid-cols-1">
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Region</Label>
              <Select v-model="form.regionId" @update:model-value="onRegionChange">
                <SelectTrigger>
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="region in regions" :key="region.id" :value="region.id">
                    {{ region.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Appellation</Label>
              <Select v-model="form.appellationId" :disabled="!form.regionId">
                <SelectTrigger>
                  <SelectValue placeholder="— none —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="appellation in appellationsForRegion"
                    :key="appellation.id"
                    :value="appellation.id"
                  >
                    {{ appellation.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p class="mt-1.5 text-[11px] leading-[1.5] text-foreground/[0.52]">
                Filtered to the chosen region.
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset class="m-0 border-0 p-0">
          <legend
            class="mb-3 w-full border-b border-border pb-1.5 font-heading text-[13px] uppercase tracking-[0.14em] text-accent-700"
          >
            The holding
          </legend>
          <div class="grid grid-cols-3 gap-x-4 gap-y-3 max-sm:grid-cols-1">
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Bottles</Label>
              <Input v-model="form.quantity" type="number" min="0" placeholder="3" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Purchase price (€)</Label>
              <Input v-model="form.purchasePrice" type="number" step="0.01" placeholder="185.00" />
              <p class="mt-1.5 text-[11px] leading-[1.5] text-foreground/[0.52]">Per bottle.</p>
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Your rating</Label>
              <Input v-model="form.rating" type="number" placeholder="optional" />
            </div>
          </div>
        </fieldset>

        <fieldset class="m-0 border-0 p-0">
          <legend
            class="mb-3 w-full border-b border-border pb-1.5 font-heading text-[13px] uppercase tracking-[0.14em] text-accent-700"
          >
            Notes
          </legend>
          <div class="grid gap-3">
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Drink note</Label>
              <Input v-model="form.readyToDrink" placeholder="Free text — the window is computed" />
            </div>
            <div>
              <Label class="mb-1.5 block text-xs text-foreground/70">Vivino link</Label>
              <Input v-model="form.vivinoLink" placeholder="https://www.vivino.com/…" />
            </div>
          </div>
        </fieldset>

        <fieldset class="m-0 border-0 p-0">
          <legend
            class="mb-3 w-full border-b border-border pb-1.5 font-heading text-[13px] uppercase tracking-[0.14em] text-accent-700"
          >
            Style
          </legend>
          <Seg v-model="form.style" name="wine-style">
            <SegOption v-for="style in STYLES" :key="style.value" :value="style.value">
              {{ style.label }}
            </SegOption>
          </Seg>
        </fieldset>

        <FeedbackBanner :feedback="feedback" />

        <div class="flex gap-2 border-t border-border pt-4">
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add to cellar' }}
          </Button>
          <Button variant="secondary" type="button" @click="router.push('/')">Cancel</Button>
          <Button
            v-if="!isEditing"
            variant="ghost"
            type="button"
            class="ml-auto"
            :disabled="isSaving"
            @click="handleSubmit(true)"
          >
            Save &amp; add another
          </Button>
        </div>
      </div>

      <aside class="border-l border-border pl-4">
        <p class="mb-3 text-[11px] uppercase tracking-[0.14em] text-foreground/[0.55]">
          Computed window
        </p>
        <template v-if="computedWindow">
          <p class="num font-heading text-[38px] leading-none">
            {{ computedWindow.enter }}–{{ computedWindow.drinkBy }}
          </p>
          <p class="mb-4 mt-1.5 text-xs text-foreground/[0.58]">
            ±{{ computedWindow.uncertaintyYears }} years &nbsp;·&nbsp; confidence
            {{ computedWindow.confidence }}
          </p>
          <div class="mb-4">
            <PhaseMark :phase="computedWindow.phaseNow" />
          </div>
          <p
            v-if="computedWindow.notes.length"
            class="text-justify text-[13px] leading-[1.7] text-foreground/[0.72]"
          >
            {{ computedWindow.notes.join(' ') }}
          </p>
        </template>
        <p v-else class="text-[13px] leading-[1.7] text-foreground/[0.72]">
          No window yet — choose a region or appellation with a mapped archetype, or enter a
          published critic window below.
        </p>

        <hr class="my-4 h-px border-0 bg-border" />

        <Label class="mb-1.5 block text-xs text-foreground/70">Critic window (override)</Label>
        <div class="flex items-center gap-2">
          <Input v-model="form.criticStart" type="number" placeholder="from" />
          <span class="text-foreground/45">–</span>
          <Input v-model="form.criticEnd" type="number" placeholder="to" />
        </div>
        <p class="mt-1.5 text-[11px] leading-[1.5] text-foreground/[0.52]">
          A published wine-specific window. When set, it overrides the computed estimate.
        </p>
      </aside>
    </form>
  </div>
</template>
