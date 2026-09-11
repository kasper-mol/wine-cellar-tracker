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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import { useFeedback } from '@/composables/useFeedback'
import { FLAVOR_LEVELS, type FlavorLevel } from '@/types/flavorDescriptors'

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { feedback, setError, clearFeedback } = useFeedback()

const open = ref(false)
const isSaving = ref(false)

const form = reactive({
  level: 'primary' as FlavorLevel,
  name: '',
  colour: 'none' as 'none' | 'white' | 'red',
  description: '',
})

function openDialog() {
  open.value = true
  clearFeedback()
}

function closeDialog() {
  open.value = false
  form.level = 'primary'
  form.name = ''
  form.colour = 'none'
  form.description = ''
}

async function handleCreate() {
  const name = form.name.trim()
  if (!name) {
    setError(null, 'Cluster name is required.')
    return
  }

  isSaving.value = true
  clearFeedback()

  try {
    await flavorDescriptorsStore.addCluster({
      level: form.level,
      name,
      colour: form.colour === 'none' ? null : form.colour,
      description: form.description,
    })
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to create cluster.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Button @click="openDialog">New cluster</Button>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Create cluster</DialogTitle>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleCreate">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Level</Label>
            <Select v-model="form.level">
              <SelectTrigger>
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="level in FLAVOR_LEVELS" :key="level" :value="level">
                  <span class="capitalize">{{ level }}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Wine colour</Label>
            <Select v-model="form.colour">
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any</SelectItem>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="red">Red</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div class="space-y-2">
          <Label for="createClusterName">Cluster</Label>
          <Input
            id="createClusterName"
            v-model="form.name"
            placeholder="e.g. Stone fruit"
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="createClusterDescription">Description</Label>
          <Input
            id="createClusterDescription"
            v-model="form.description"
            placeholder="e.g. lees, autolysis"
          />
        </div>
        <FeedbackBanner :feedback="feedback" />
        <DialogFooter>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Create cluster' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
