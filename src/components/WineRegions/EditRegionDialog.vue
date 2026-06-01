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
import ImageUploader from '@/components/ImageUploader.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useFeedback } from '@/composables/useFeedback'

const props = defineProps<{ regionId: string | null }>()

const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const isUpdating = ref(false)
const open = ref(false)

function openDialog() {
  open.value = true
}
function closeDialog() {
  open.value = false
  clearFeedback()
}
defineExpose({ openDialog })

const form = reactive({
  name: '',
  countryId: '',
  imageFile: null as File | null,
  currentImageUrl: '' as string | null,
})

const selectedRegion = computed(
  () => wineRegionsStore.regions.find((r) => r.id === props.regionId) ?? null,
)

watch(
  selectedRegion,
  (region) => {
    form.name = region?.name ?? ''
    form.countryId = region?.country_id ?? ''
    form.currentImageUrl = region?.image_url ?? ''
    form.imageFile = null
  },
  { immediate: true },
)

async function handleUpdate() {
  if (!selectedRegion.value) return
  if (!form.name.trim()) {
    setError(null, 'Region name is required.')
    return
  }
  if (!form.countryId) {
    setError(null, 'Select a country first.')
    return
  }

  isUpdating.value = true
  clearFeedback()

  try {
    await wineRegionsStore.update(selectedRegion.value.id, {
      name: form.name.trim(),
      country_id: form.countryId,
      imageFile: form.imageFile,
    })
    setSuccess('Region updated successfully.')
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to update region.')
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
        <div class="space-y-2">
          <ImageUploader
            v-model="form.imageFile"
            :label="form.currentImageUrl ? 'Change Region Image' : 'Region Image (optional)'"
          />
          <div v-if="form.currentImageUrl && !form.imageFile" class="space-y-1">
            <Label>Current Image</Label>
            <img
              :src="form.currentImageUrl"
              alt="Current Region Image"
              class="h-32 w-32 rounded-md border object-cover"
            />
          </div>
        </div>
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter>
          <Button type="submit" :disabled="isUpdating">{{
            isUpdating ? 'Saving…' : 'Save'
          }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
