<script setup lang="ts">
import { ref } from 'vue'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { useVintageRatingsStore } from '@/stores/vintageRatings'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const vintageRatingsStore = useVintageRatingsStore()

const form = ref({
  name: '',
  url: '',
  description: '',
})

async function save() {
  if (!form.value.name.trim()) return

  await vintageRatingsStore.addSource({
    name: form.value.name,
    url: form.value.url || null,
    description: form.value.description || null,
  })

  emit('close')
}
</script>

<template>
  <Dialog open @update:open="emit('close')">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>Add rating source</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div>
          <Label>Name</Label>
          <Input v-model="form.name" placeholder="e.g. Robert Parker" />
        </div>

        <div>
          <Label>Website (optional)</Label>
          <Input v-model="form.url" placeholder="https://…" />
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Textarea v-model="form.description" rows="3" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" @click="emit('close')"> Cancel </Button>
        <Button @click="save"> Save </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
