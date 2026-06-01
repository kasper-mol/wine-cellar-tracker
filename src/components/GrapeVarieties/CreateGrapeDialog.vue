<script setup lang="ts">
import { ref, reactive, defineExpose } from 'vue'
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
import type { GrapeColor } from '@/types/grapeVarieties'
import ImageUploader from '../ImageUploader.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { useFeedback } from '@/composables/useFeedback'

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const { feedback, setError, clearFeedback } = useFeedback()

const dialogOpen = ref(false)
const isCreating = ref(false)
const createForm = reactive({
  name: '',
  color: '',
  description: '',
  imageFile: null as File | null,
})

const colorOptions: Array<{ value: GrapeColor; label: string }> = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
]

function normalizeColor(value: string) {
  const normalized = value.trim().toLowerCase()
  return ['red', 'white', 'rose'].includes(normalized) ? (normalized as GrapeColor) : null
}

async function handleCreate() {
  if (!createForm.name.trim()) {
    setError(null, 'Grape name is required.')
    return
  }

  isCreating.value = true
  clearFeedback()

  try {
    await grapeVarietiesStore.create({
      name: createForm.name.trim(),
      color: normalizeColor(createForm.color),
      description: createForm.description.trim() || null,
      imageFile: createForm.imageFile,
    })
    dialogOpen.value = false
    createForm.name = ''
    createForm.color = ''
    createForm.description = ''
    createForm.imageFile = null
  } catch (error) {
    setError(error, 'Failed to add grape variety.')
  } finally {
    isCreating.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
}

defineExpose({ openDialog })
</script>

<template>
  <Button @click="openDialog">Add Grape</Button>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Grape Variety</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="createForm.name" required />
        </div>
        <div class="space-y-2">
          <Label>Color (optional)</Label>
          <select v-model="createForm.color" class="w-full rounded-md border px-3 py-2">
            <option value="">Not specified</option>
            <option v-for="opt in colorOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="space-y-2">
          <Label>Description (optional)</Label>
          <textarea
            v-model="createForm.description"
            class="w-full rounded-md border px-3 py-2"
          ></textarea>
        </div>
        <ImageUploader v-model="createForm.imageFile" label="Grape Image (optional)" />
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter>
          <Button type="submit" :disabled="isCreating">{{ isCreating ? 'Adding…' : 'Add' }}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
