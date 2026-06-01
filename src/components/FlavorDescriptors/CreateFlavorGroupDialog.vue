<script setup lang="ts">
import { ref, reactive } from 'vue'
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
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import { useFeedback } from '@/composables/useFeedback'

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { feedback, setError, clearFeedback } = useFeedback()

const open = ref(false)
const isSaving = ref(false)

const form = reactive({
  level: '',
  category: '',
  name: '',
})

function openDialog() {
  open.value = true
  clearFeedback()
}

function closeDialog() {
  open.value = false
  form.level = ''
  form.category = ''
  form.name = ''
}

async function handleCreate() {
  const level = form.level.trim()
  const name = form.name.trim()

  if (!level || !name) {
    setError(null, 'Level and descriptor name are required.')
    return
  }

  isSaving.value = true
  clearFeedback()

  try {
    await flavorDescriptorsStore.add({
      level,
      category: form.category.trim() || null,
      name,
    })
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to create flavor group.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Button @click="openDialog">New flavor group</Button>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Create flavor group</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="space-y-2">
          <Label for="createLevel">Level</Label>
          <Input id="createLevel" v-model="form.level" placeholder="e.g. primary" required />
        </div>
        <div class="space-y-2">
          <Label for="createCategory">Category</Label>
          <Input id="createCategory" v-model="form.category" placeholder="e.g. fruit" />
        </div>
        <div class="space-y-2">
          <Label for="createName">First descriptor</Label>
          <Input id="createName" v-model="form.name" placeholder="e.g. cherry" required />
        </div>
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Create group' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
