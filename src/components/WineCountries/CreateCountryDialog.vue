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
import { useWineCountriesStore } from '@/stores/wineCountries'

const wineCountriesStore = useWineCountriesStore()

const dialogOpen = ref(false)
const form = reactive({ name: '', code: '' })
const isCreating = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

function normalizeCode(value: string) {
  return value.trim() ? value.trim().toUpperCase() : ''
}

async function handleCreate() {
  const name = form.name.trim()
  if (!name) {
    feedback.value = { type: 'error', message: 'Country name is required.' }
    return
  }

  isCreating.value = true
  feedback.value = null

  try {
    await wineCountriesStore.create({
      name,
      code: normalizeCode(form.code) || null,
    })
    feedback.value = { type: 'success', message: 'Country added successfully.' }
    closeDialog()
  } catch (error) {
    feedback.value = {
      type: 'error',
      message: (error as Error).message || 'Failed to add country.',
    }
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
  feedback.value = null
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
        <DialogFooter class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="closeDialog">Cancel</Button>
          <Button type="submit" :disabled="isCreating">{{ isCreating ? 'Adding…' : 'Add' }}</Button>
        </DialogFooter>
        <p v-if="feedback" :class="feedback.type === 'error' ? 'text-red-500' : 'text-green-500'">
          {{ feedback.message }}
        </p>
      </form>
    </DialogContent>
  </Dialog>
</template>
