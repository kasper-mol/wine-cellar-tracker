<script setup lang="ts">
import { reactive, ref, defineExpose } from 'vue'
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
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'

const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()

const isCreating = ref(false)

const dialogOpen = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const form = reactive({
  name: '',
  countryId: '',
  imageFile: null as File | null,
})

async function handleCreate() {
  if (!form.name.trim()) {
    feedback.value = { type: 'error', message: 'Region name is required.' }
    return
  }
  if (!form.countryId) {
    feedback.value = { type: 'error', message: 'Select a country first.' }
    return
  }

  isCreating.value = true
  feedback.value = null

  try {
    await wineRegionsStore.create({
      name: form.name.trim(),
      country_id: form.countryId,
      imageFile: form.imageFile,
    })
    form.name = ''
    form.countryId = ''
    form.imageFile = null
    closeDialog()
  } catch (error) {
    feedback.value = { type: 'error', message: (error as Error).message || 'Failed to add region.' }
  } finally {
    isCreating.value = false
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
  <Button @click="openDialog">Add Region</Button>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Region</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="space-y-2">
          <Label for="regionName">Name</Label>
          <Input id="regionName" v-model="form.name" placeholder="e.g. Bordeaux" required />
        </div>
        <div class="space-y-2">
          <Label for="regionCountry">Country</Label>
          <select
            id="regionCountry"
            v-model="form.countryId"
            class="flex h-10 w-full rounded-md border px-3 py-2"
            required
          >
            <option value="" disabled>Select a country</option>
            <option
              v-for="country in wineCountriesStore.countries"
              :key="country.id"
              :value="country.id"
            >
              {{ country.name }}
            </option>
          </select>
        </div>
        <ImageUploader v-model="form.imageFile" label="Region Image (optional)" />
        <DialogFooter>
          <Button type="submit" :disabled="isCreating">{{ isCreating ? 'Adding…' : 'Add' }}</Button>
          <Button type="button" variant="outline" @click="closeDialog">Cancel</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
