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
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useFeedback } from '@/composables/useFeedback'

const wineCountriesStore = useWineCountriesStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const dialogOpen = ref(false)
const form = reactive({ name: '', code: '', imageFile: null as File | null })
const isCreating = ref(false)

function normalizeCode(value: string) {
  return value.trim() ? value.trim().toUpperCase() : ''
}

async function handleCreate() {
  const name = form.name.trim()
  if (!name) {
    setError(null, 'Country name is required.')
    return
  }

  isCreating.value = true
  clearFeedback()

  try {
    await wineCountriesStore.create({
      name,
      code: normalizeCode(form.code) || null,
      imageFile: form.imageFile,
    })
    setSuccess('Country added successfully.')
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to add country.')
  } finally {
    isCreating.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
}
function closeDialog() {
  dialogOpen.value = false
  form.name = ''
  form.code = ''
  form.imageFile = null
  clearFeedback()
}

defineExpose({ openDialog })
</script>

<template>
  <Button @click="openDialog">Add Country</Button>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Country</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="space-y-2">
          <Label for="name">Name</Label>
          <Input id="name" v-model="form.name" placeholder="e.g. France" required />
        </div>
        <div class="space-y-2">
          <Label for="code">
            ISO Code <span class="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input id="code" v-model="form.code" placeholder="FR" class="uppercase" maxlength="3" />
        </div>
        <ImageUploader v-model="form.imageFile" label="Country Image (optional)" />
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="closeDialog">Cancel</Button>
          <Button type="submit" :disabled="isCreating">{{ isCreating ? 'Adding…' : 'Add' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
