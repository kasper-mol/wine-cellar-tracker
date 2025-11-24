<script setup lang="ts">
import { ref, reactive, computed, defineExpose, watch } from 'vue'
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
import type { GrapeColor } from '@/services/grapeVarieties'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'

const props = defineProps<{ grapeId: string | null }>()

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const dialogOpen = ref(false)
const isUpdating = ref(false)

const editForm = reactive({
  name: '',
  color: '',
  description: '',
  imageFile: null as File | null,
  currentImageUrl: '' as string | null,
})

const colorOptions: Array<{ value: GrapeColor; label: string }> = [
  { value: 'red', label: 'Red' },
  { value: 'white', label: 'White' },
  { value: 'rose', label: 'Rose' },
]

const selectedGrape = computed(() =>
  grapeVarietiesStore.grapeVarieties.find((g) => g.id === props.grapeId),
)

// When the selected grape changes, populate the form
watch(selectedGrape, (grape) => {
  if (!grape) return
  editForm.name = grape.name
  editForm.color = grape.color ?? ''
  editForm.description = grape.description ?? ''
  editForm.currentImageUrl = grape.image_url ?? ''
  editForm.imageFile = null // reset file
})

function normalizeColor(value: string) {
  const normalized = value.trim().toLowerCase()
  return ['red', 'white', 'rose'].includes(normalized) ? (normalized as GrapeColor) : null
}

async function handleUpdate() {
  if (!selectedGrape.value) return
  if (!editForm.name.trim()) return
  isUpdating.value = true

  try {
    await grapeVarietiesStore.update(selectedGrape.value.id, {
      name: editForm.name.trim(),
      color: normalizeColor(editForm.color),
      description: editForm.description.trim() || null,
      imageFile: editForm.imageFile, // pass new image if selected
    })

    dialogOpen.value = false
  } finally {
    isUpdating.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
}

defineExpose({ openDialog })
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Grape Variety</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="handleUpdate">
        <div class="space-y-2">
          <Label>Name</Label>
          <Input v-model="editForm.name" required />
        </div>

        <div class="space-y-2">
          <Label>Color (optional)</Label>
          <select v-model="editForm.color" class="w-full rounded-md border px-3 py-2">
            <option value="">Not specified</option>
            <option v-for="opt in colorOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <div class="space-y-2">
          <Label>Description (optional)</Label>
          <textarea
            v-model="editForm.description"
            class="w-full rounded-md border px-3 py-2"
          ></textarea>
        </div>

        <!-- ⭐ Image uploader -->
        <ImageUploader
          v-model="editForm.imageFile"
          :label="editForm.currentImageUrl ? 'Change Grape Image' : 'Grape Image (optional)'"
        />

        <!-- Show current image if no new file selected -->
        <div v-if="editForm.currentImageUrl && !editForm.imageFile" class="pt-2">
          <Label>Current Image</Label>
          <img
            :src="editForm.currentImageUrl"
            alt="Current Grape Image"
            class="w-32 h-32 object-cover rounded-md border"
          />
        </div>

        <DialogFooter>
          <Button type="submit" :disabled="isUpdating">
            {{ isUpdating ? 'Saving…' : 'Save changes' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
