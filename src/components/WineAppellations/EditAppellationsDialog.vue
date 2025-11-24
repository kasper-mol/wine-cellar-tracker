<script setup lang="ts">
import { ref, reactive, computed, watch, defineExpose } from 'vue'
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
import { storeToRefs } from 'pinia'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'

const props = defineProps<{ appellationId: string | undefined }>()
const emit = defineEmits<{
  (e: 'updated'): void
}>()

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(wineCountriesStore)
const dialogOpen = ref(true)
const isUpdating = ref(false)
const editForm = reactive({
  name: '',
  regionId: '',
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

watch(
  selectedAppellation,
  (appellation?) => {
    editForm.name = appellation?.name ?? ''
    selectedCountryId.value = appellation?.region?.country_id ?? null
    editForm.regionId = appellation?.region_id ?? ''
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
    <DialogContent>
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
