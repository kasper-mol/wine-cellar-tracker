<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
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
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import { useFeedback } from '@/composables/useFeedback'
import { clusterLabel } from '@/content/flavorLevels'
import { FLAVOR_LEVELS, type FlavorLevel } from '@/types/flavorDescriptors'

const props = defineProps<{
  clusterId: string | null
}>()

const emit = defineEmits<{
  (e: 'clusterRemoved'): void
}>()

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const { clustersWithDescriptors } = storeToRefs(flavorDescriptorsStore)
const { feedback, setError, clearFeedback } = useFeedback()

const cluster = computed(
  () => clustersWithDescriptors.value.find((c) => c.id === props.clusterId) ?? null,
)

const form = reactive({
  level: 'primary' as FlavorLevel,
  name: '',
  colour: 'none' as 'none' | 'white' | 'red',
  description: '',
})
const newDescriptor = reactive({ name: '', note: '' })
const isSaving = ref(false)
const isAdding = ref(false)

watch(
  () => props.clusterId,
  () => {
    form.level = cluster.value?.level ?? 'primary'
    form.name = cluster.value?.name ?? ''
    form.colour = cluster.value?.colour ?? 'none'
    form.description = cluster.value?.description ?? ''
    newDescriptor.name = ''
    newDescriptor.note = ''
    clearFeedback()
  },
  { immediate: true },
)

const open = ref(false)
function openDialog() {
  open.value = true
}
function closeDialog() {
  open.value = false
}
defineExpose({ openDialog })

async function handleUpdateCluster() {
  if (!cluster.value) return
  const name = form.name.trim()
  if (!name) {
    setError(null, 'Cluster name is required.')
    return
  }

  isSaving.value = true
  clearFeedback()

  try {
    await flavorDescriptorsStore.updateCluster(cluster.value.id, {
      level: form.level,
      name,
      colour: form.colour === 'none' ? null : form.colour,
      description: form.description,
    })
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to update cluster.')
  } finally {
    isSaving.value = false
  }
}

async function handleAddDescriptor() {
  if (!cluster.value) return
  const name = newDescriptor.name.trim()
  if (!name) {
    setError(null, 'Descriptor name is required.')
    return
  }

  isAdding.value = true
  clearFeedback()

  try {
    await flavorDescriptorsStore.addDescriptor({
      cluster_id: cluster.value.id,
      name,
      note: newDescriptor.note,
    })
    newDescriptor.name = ''
    newDescriptor.note = ''
  } catch (error) {
    setError(error, 'Failed to add descriptor.')
  } finally {
    isAdding.value = false
  }
}

async function handleRemoveDescriptor(id: string, name: string) {
  const confirmed = await confirmRef.value?.confirm({
    title: 'Remove descriptor',
    body: `${name} will be removed from this cluster. This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await flavorDescriptorsStore.removeDescriptor(id)
  } catch (error) {
    setError(error, 'Failed to remove descriptor.')
  }
}

async function handleRemoveCluster() {
  if (!cluster.value) return
  const label = clusterLabel(cluster.value)
  const count = cluster.value.descriptors.length
  const confirmed = await confirmRef.value?.confirm({
    title: 'Remove cluster',
    body: `${label} and its ${count} descriptor${count === 1 ? '' : 's'} will be removed. This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await flavorDescriptorsStore.removeCluster(cluster.value.id)
    emit('clusterRemoved')
    closeDialog()
  } catch (error) {
    setError(error, 'Failed to remove cluster.')
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit cluster</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="handleUpdateCluster">
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
          <div class="space-y-2">
            <Label for="editClusterName">Cluster</Label>
            <Input id="editClusterName" v-model="form.name" required />
          </div>
          <div class="space-y-2">
            <Label for="editClusterDescription">Description</Label>
            <Input id="editClusterDescription" v-model="form.description" />
          </div>
        </div>

        <div class="rounded-lg border border-border p-4">
          <p class="text-sm font-medium text-foreground">Descriptors in this cluster</p>
          <p v-if="!cluster?.descriptors.length" class="mt-2 text-sm text-muted-foreground">
            No descriptors in this cluster yet.
          </p>
          <div v-else class="mt-3 grid gap-2">
            <div
              v-for="descriptor in cluster.descriptors"
              :key="descriptor.id"
              class="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
            >
              <span class="text-sm text-foreground">
                <span class="font-medium">{{ descriptor.name }}</span>
                <span v-if="descriptor.note" class="text-muted-foreground">
                  ({{ descriptor.note }})
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="text-destructive hover:text-destructive"
                @click="handleRemoveDescriptor(descriptor.id, descriptor.name)"
              >
                Remove
              </Button>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-end gap-2">
            <div class="flex-1 space-y-1">
              <Label for="newDescriptorName">Add descriptor</Label>
              <Input id="newDescriptorName" v-model="newDescriptor.name" placeholder="e.g. lime" />
            </div>
            <div class="w-40 space-y-1">
              <Label for="newDescriptorNote">Note</Label>
              <Input
                id="newDescriptorNote"
                v-model="newDescriptor.note"
                placeholder="juice or zest?"
              />
            </div>
            <Button type="button" :disabled="isAdding" @click="handleAddDescriptor">
              {{ isAdding ? 'Adding...' : 'Add' }}
            </Button>
          </div>
        </div>

        <FeedbackBanner :feedback="feedback" />

        <DialogFooter class="sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            class="text-destructive hover:text-destructive"
            @click="handleRemoveCluster"
          >
            Remove cluster
          </Button>
          <Button type="submit" :disabled="isSaving">
            {{ isSaving ? 'Saving...' : 'Save cluster' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
  <ConfirmDialog ref="confirmRef" />
</template>
