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
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'

const flavorDescriptorsStore = useFlavorDescriptorsStore()

const open = ref(false)
const isSaving = ref(false)
const feedback = ref<string | null>(null)

const form = reactive({
  level: '',
  category: '',
  name: '',
})

function openDialog() {
  open.value = true
  feedback.value = null
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
    feedback.value = 'Level and descriptor name are required.'
    return
  }

  isSaving.value = true
  feedback.value = null

  try {
    await flavorDescriptorsStore.add({
      level,
      category: form.category.trim() || null,
      name,
    })
    closeDialog()
  } catch (error) {
    feedback.value = (error as Error).message || 'Failed to create flavor group.'
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
        <p v-if="feedback" class="text-sm text-destructive">{{ feedback }}</p>
        <DialogFooter>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Create group' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
