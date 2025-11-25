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
import { useWineCountriesStore } from '@/stores/wineCountries'

const props = defineProps<{ countryId: string | null }>()

const wineCountriesStore = useWineCountriesStore()

const isUpdating = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const editForm = reactive({
  name: '',
  code: '',
  imageFile: null as File | null,
  currentImageUrl: '' as string | null,
})
const selectedCountry = computed(
  () => wineCountriesStore.countries.find((country) => country.id === props.countryId) ?? null,
)

watch(
  selectedCountry,
  (country) => {
    editForm.name = country?.name ?? ''
    editForm.code = country?.code ?? ''
    editForm.currentImageUrl = country?.image_url ?? ''
    editForm.imageFile = null
  },
  { immediate: true },
)

// Dialog open state
const open = ref(false)
function openDialog() {
  open.value = true
}
function closeDialog() {
  open.value = false
}

// Expose function so parent can call it
defineExpose({ openDialog })

function normalizeCode(value: string) {
  return value.trim() ? value.trim().toUpperCase() : ''
}

async function handleUpdate() {
  if (!selectedCountry.value) return
  const name = editForm.name.trim()
  if (!name) {
    feedback.value = { type: 'error', message: 'Country name is required.' }
    return
  }
  isUpdating.value = true
  feedback.value = null

  try {
    await wineCountriesStore.update(selectedCountry.value.id, {
      name,
      code: normalizeCode(editForm.code) || null,
      imageFile: editForm.imageFile,
    })
    feedback.value = { type: 'success', message: 'Country updated successfully.' }
    closeDialog()
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: (error as Error).message || 'Failed to update country.',
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
        <DialogTitle>Edit Country</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div class="space-y-2">
          <Label for="editName">Name</Label>
          <Input id="editName" v-model="editForm.name" required />
        </div>
        <div class="space-y-2">
          <Label for="editCode"
            >ISO Code <span class="text-xs text-muted-foreground">(optional)</span></Label
          >
          <Input id="editCode" v-model="editForm.code" class="uppercase" maxlength="3" />
        </div>
        <div class="space-y-2">
          <ImageUploader
            v-model="editForm.imageFile"
            :label="editForm.currentImageUrl ? 'Change Country Image' : 'Country Image (optional)'"
          />
          <div v-if="editForm.currentImageUrl && !editForm.imageFile" class="pt-2 space-y-1">
            <Label>Current Image</Label>
            <img
              :src="editForm.currentImageUrl"
              alt="Current Country Image"
              class="w-32 h-32 rounded-md border object-cover"
            />
          </div>
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
