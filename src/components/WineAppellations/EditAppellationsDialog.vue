<script setup lang="ts">
import { ref, reactive, computed, watch, defineExpose, onMounted } from 'vue'
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
import ImageUploader from '@/components/ImageUploader.vue'
import { storeToRefs } from 'pinia'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'
import GrapeAppellationManager from './GrapeAppellationManager.vue'

const props = defineProps<{ appellationId: string | null | undefined }>()
const emit = defineEmits<{
  (e: 'updated'): void
}>()

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(wineCountriesStore)
const dialogOpen = ref(false)
const isUpdating = ref(false)
const editForm = reactive({
  name: '',
  regionId: '',
  imageFile: null as File | null,
  currentImageUrl: '' as string | null,
})
const selectedCountryId = ref<string | null>(null)

const selectedAppellation = computed(
  () => wineAppellationsStore.appellations.find((c) => c.id === props.appellationId) ?? null,
)

const regionsForCountry = computed(() =>
  selectedCountryId.value
    ? wineRegionsStore.regions.filter((r) => r.country_id === selectedCountryId.value)
    : [],
)

onMounted(() => {
  console.log(selectedAppellation.value)
})

watch(
  selectedAppellation,
  (appellation?) => {
    editForm.name = appellation?.name ?? ''
    selectedCountryId.value = appellation?.region?.country_id ?? null
    editForm.regionId = appellation?.region_id ?? ''
    editForm.currentImageUrl = appellation?.image_url ?? ''
    editForm.imageFile = null
  },
  { immediate: true },
)

async function handleUpdate() {
  if (!props.appellationId) return
  const name = editForm.name.trim()
  if (!name) return
  if (!editForm.regionId) return

  isUpdating.value = true
  try {
    await wineAppellationsStore.update(props.appellationId, {
      name,
      region_id: editForm.regionId,
      imageFile: editForm.imageFile,
    })
    closeDialog()
    emit('updated')
  } finally {
    isUpdating.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
}

function closeDialog() {
  dialogOpen.value = false
}

defineExpose({ openDialog })
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Edit Appellation</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="editForm.name" placeholder="e.g. Pauillac" required />
        </div>
        <div class="space-y-2">
          <Label>Country</Label>
          <select v-model="selectedCountryId" class="w-full border rounded p-2" required>
            <option value="" disabled>Select country</option>
            <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <Label>Region</Label>
          <select
            v-model="editForm.regionId"
            class="w-full border rounded p-2"
            :disabled="regionsForCountry.length === 0"
            required
          >
            <option value="" disabled>Select region</option>
            <option v-for="r in regionsForCountry" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div class="space-y-2">
          <ImageUploader
            v-model="editForm.imageFile"
            :label="editForm.currentImageUrl ? 'Change Appellation Image' : 'Appellation Image (optional)'"
          />
          <div v-if="editForm.currentImageUrl && !editForm.imageFile" class="space-y-1">
            <Label>Current Image</Label>
            <img
              :src="editForm.currentImageUrl"
              alt="Current Appellation Image"
              class="h-32 w-32 rounded-md border object-cover"
            />
          </div>
        </div>
        <GrapeAppellationManager :appellationId="appellationId ?? null" />

        <DialogFooter>
          <Button type="button" variant="outline" @click="closeDialog">Cancel</Button>
          <Button type="submit" :disabled="isUpdating">{{
            isUpdating ? 'Saving…' : 'Save'
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
