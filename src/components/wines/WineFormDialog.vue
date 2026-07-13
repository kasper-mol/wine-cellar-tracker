<script setup lang="ts">
import { reactive, ref, computed, defineExpose } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useMainStore } from '@/stores/main'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useFeedback } from '@/composables/useFeedback'
import type { UserWine, WineCreatePayload, WineStyle } from '@/types/wines'

const STYLES: WineStyle[] = ['red', 'white', 'rosé', 'sparkling', 'dessert']

const emit = defineEmits<{ saved: [message: string] }>()

const mainStore = useMainStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { feedback, setError, clearFeedback } = useFeedback()

const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)

const dialogOpen = ref(false)
const isSaving = ref(false)
const editingId = ref<string | null>(null)
const isEditing = computed(() => editingId.value !== null)

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

function open(wine?: UserWine) {
  clearFeedback()
  Object.assign(form, blank())
  if (wine) {
    editingId.value = wine.id
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
  } else {
    editingId.value = null
  }
  dialogOpen.value = true
}

const num = (v: string) => (v.trim() === '' ? null : Number(v))

async function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    setError(null, 'Wine name is required.')
    return
  }

  const payload: WineCreatePayload = {
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

  isSaving.value = true
  clearFeedback()
  try {
    if (editingId.value) {
      await mainStore.editWine(editingId.value, payload)
      emit('saved', `Updated “${name}”.`)
    } else {
      await mainStore.addWine(payload)
      emit('saved', `Added “${name}” to your cellar.`)
    }
    dialogOpen.value = false
  } catch (error) {
    setError(error, 'Failed to save wine.')
  } finally {
    isSaving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEditing ? 'Edit wine' : 'Add wine' }}</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="form.name" placeholder="e.g. Barolo" />
        </div>
        <div class="space-y-2">
          <Label>Producer</Label>
          <Input v-model="form.producer" placeholder="e.g. Boroli" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Vintage</Label>
            <Input v-model="form.vintage" type="number" placeholder="e.g. 2018 (blank = NV)" />
          </div>
          <div class="space-y-2">
            <Label>Bottles</Label>
            <Input v-model="form.quantity" type="number" min="0" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Region</Label>
            <select
              v-model="form.regionId"
              class="w-full border rounded p-2 bg-background"
              @change="onRegionChange"
            >
              <option value="">— none —</option>
              <option v-for="r in regions" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <Label>Appellation</Label>
            <select
              v-model="form.appellationId"
              class="w-full border rounded p-2 bg-background disabled:opacity-50"
              :disabled="!form.regionId"
            >
              <option value="">— none —</option>
              <option v-for="a in appellationsForRegion" :key="a.id" :value="a.id">
                {{ a.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Style</Label>
            <select v-model="form.style" class="w-full border rounded p-2 bg-background">
              <option value="">— none —</option>
              <option v-for="s in STYLES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <Label>Rating</Label>
            <Input v-model="form.rating" type="number" placeholder="optional" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Purchase price (€)</Label>
            <Input v-model="form.purchasePrice" type="number" step="0.01" placeholder="optional" />
          </div>
          <div class="space-y-2">
            <Label>Drink notes (free text)</Label>
            <Input v-model="form.readyToDrink" placeholder="optional note — window is computed" />
          </div>
        </div>

        <div class="space-y-2">
          <Label>Critic window (override)</Label>
          <div class="flex items-center gap-2">
            <Input v-model="form.criticStart" type="number" placeholder="from year" />
            <span class="text-muted-foreground">–</span>
            <Input v-model="form.criticEnd" type="number" placeholder="to year" />
          </div>
          <p class="text-xs text-muted-foreground">
            A published wine-specific window. When set, it overrides the computed estimate.
          </p>
        </div>

        <div class="space-y-2">
          <Label>Grape(s)</Label>
          <Input v-model="form.varietal" placeholder="e.g. Nebbiolo" />
        </div>
        <div class="space-y-2">
          <Label>Vivino link</Label>
          <Input v-model="form.vivinoLink" placeholder="https://www.vivino.com/…" />
        </div>

        <FeedbackBanner :feedback="feedback" />
        <DialogFooter class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="dialogOpen = false">Cancel</Button>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Add wine' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
