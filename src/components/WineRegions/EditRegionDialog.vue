<script setup lang="ts">
import { computed, reactive, ref, watch, defineExpose } from 'vue'
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
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'

const props = defineProps<{ regionId: string | null }>()

const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()

const isUpdating = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const open = ref(false)

function openDialog() {
  open.value = true
}
function closeDialog() {
  open.value = false
}
defineExpose({ openDialog })

const form = reactive({ name: '', countryId: '' })

const selectedRegion = computed(
  () => wineRegionsStore.regions.find((r) => r.id === props.regionId) ?? null,
)

watch(
  selectedRegion,
  (region) => {
    form.name = region?.name ?? ''
    form.countryId = region?.country_id ?? ''
  },
  { immediate: true },
)

async function handleUpdate() {
  if (!selectedRegion.value) return
  if (!form.name.trim()) {
    feedback.value = { type: 'error', message: 'Region name is required.' }
    return
  }
  if (!form.countryId) {
    feedback.value = { type: 'error', message: 'Select a country first.' }
    return
  }

  isUpdating.value = true
  feedback.value = null

  try {
    await wineRegionsStore.update(selectedRegion.value.id, {
      name: form.name.trim(),
      country_id: form.countryId,
    })
    feedback.value = { type: 'success', message: 'Region updated successfully.' }
    closeDialog()
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: (error as Error).message || 'Failed to update region.',
    }
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Region</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div class="space-y-2">
          <Label for="editRegionName">Name</Label>
          <Input id="editRegionName" v-model="form.name" required />
        </div>
        <div class="space-y-2">
          <Label for="editRegionCountry">Country</Label>
          <select
            id="editRegionCountry"
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
        <DialogFooter>
          <Button type="submit" :disabled="isUpdating">{{
            isUpdating ? 'Saving…' : 'Save'
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
