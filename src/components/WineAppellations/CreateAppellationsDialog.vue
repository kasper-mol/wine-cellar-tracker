<script setup lang="ts">
import { reactive, ref, computed, watch, defineExpose } from 'vue'
import { Plus } from 'lucide-vue-next'
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
import GrapeAppellationManager from './GrapeAppellationManager.vue'
import AppellationCopyFields from './AppellationCopyFields.vue'
import { copyFormToPayload, emptyCopyForm } from '@/lib/appellationCopyForm'
import ImageUploader from '@/components/ImageUploader.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { storeToRefs } from 'pinia'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useFeedback } from '@/composables/useFeedback'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)

const dialogOpen = ref(false)
const isCreating = ref(false)
const selectedCountryId = ref<string | null>(countries.value[0]?.id ?? null)
const createdAppellationId = ref<string | null>(null)

const createForm = reactive({
  name: '',
  regionId: '',
  imageFile: null as File | null,
})
const copyForm = reactive(emptyCopyForm())

const regionsForCountry = computed(() =>
  regions.value.filter((r) => r.country_id === selectedCountryId.value),
)

const isCreated = computed(() => Boolean(createdAppellationId.value))

watch(selectedCountryId, (val) => {
  const firstRegion = regions.value.find((r) => r.country_id === val)
  createForm.regionId = firstRegion?.id ?? ''
})

async function handleCreate() {
  if (createdAppellationId.value) {
    setSuccess('Appellation already saved. Add grape rules below.')
    return
  }

  const name = createForm.name.trim()
  if (!name) {
    setError(null, 'Appellation name required.')
    return
  }
  if (!createForm.regionId) {
    setError(null, 'Select a region.')
    return
  }

  isCreating.value = true
  clearFeedback()

  try {
    const created = await wineAppellationsStore.create({
      name,
      region_id: createForm.regionId,
      imageFile: createForm.imageFile,
      ...copyFormToPayload(copyForm),
    })
    createdAppellationId.value = created.id
    setSuccess('Appellation saved. You can now add grape rules below.')
  } catch (error) {
    setError(error, 'Failed to create appellation.')
  } finally {
    isCreating.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
}
function closeDialog() {
  dialogOpen.value = false
  createForm.name = ''
  createForm.regionId = ''
  createForm.imageFile = null
  Object.assign(copyForm, emptyCopyForm())
  selectedCountryId.value = countries.value[0]?.id ?? null
  clearFeedback()
  createdAppellationId.value = null
}

defineExpose({ openDialog })
</script>

<template>
  <Button @click="openDialog">
    <Plus class="h-3.5 w-3.5" :stroke-width="1.5" />
    New appellation
  </Button>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add Appellation</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="createForm.name" :disabled="isCreated" placeholder="e.g. Pauillac" />
        </div>
        <div class="space-y-2">
          <Label>Country</Label>
          <select
            v-model="selectedCountryId"
            class="w-full border rounded p-2"
            :disabled="isCreated"
          >
            <option value="" disabled>Select a country</option>
            <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <Label>Region</Label>
          <select
            v-model="createForm.regionId"
            class="w-full border rounded p-2"
            :disabled="isCreated"
          >
            <option value="" disabled>Select a region</option>
            <option v-for="r in regionsForCountry" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <AppellationCopyFields v-model="copyForm" :disabled="isCreated" />
        <GrapeAppellationManager :appellationId="createdAppellationId" />
        <ImageUploader v-model="createForm.imageFile" label="Appellation Image (optional)" />
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="closeDialog">Cancel</Button>
          <Button type="submit" :disabled="isCreating || isCreated">
            {{ isCreating ? 'Adding…' : isCreated ? 'Saved' : 'Add' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
