<script setup lang="ts">
import { computed, reactive, ref, watch, defineExpose } from 'vue'
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
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'

const props = defineProps<{
  group: { level: string; category: string | null } | null
}>()

const emit = defineEmits<{
  (e: 'groupUpdated', payload: { level: string; category: string | null }): void
  (e: 'groupCleared'): void
}>()

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { descriptors } = storeToRefs(flavorDescriptorsStore)

const groupDescriptors = computed(() => {
  if (!props.group) return []
  return descriptors.value
    .filter(
      (descriptor) =>
        descriptor.level === props.group?.level &&
        (descriptor.category ?? null) === (props.group?.category ?? null),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
})

const form = reactive({
  level: '',
  category: '',
})

const newDescriptorName = ref('')
const isSaving = ref(false)
const isAdding = ref(false)
const feedback = ref<string | null>(null)

watch(
  () => props.group,
  (group) => {
    form.level = group?.level ?? ''
    form.category = group?.category ?? ''
    newDescriptorName.value = ''
    feedback.value = null
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

async function handleUpdateGroup() {
  if (!props.group) return
  const level = form.level.trim()
  if (!level) {
    feedback.value = 'Level is required.'
    return
  }

  isSaving.value = true
  feedback.value = null

  try {
    await Promise.all(
      groupDescriptors.value.map((descriptor) =>
        flavorDescriptorsStore.update(descriptor.id, {
          level,
          category: form.category.trim() || null,
        }),
      ),
    )
    emit('groupUpdated', { level, category: form.category.trim() || null })
    closeDialog()
  } catch (error) {
    feedback.value = (error as Error).message || 'Failed to update group.'
  } finally {
    isSaving.value = false
  }
}

async function handleAddDescriptor() {
  const name = newDescriptorName.value.trim()
  if (!name) {
    feedback.value = 'Descriptor name is required.'
    return
  }
  if (!form.level.trim()) {
    feedback.value = 'Level is required before adding a descriptor.'
    return
  }

  isAdding.value = true
  feedback.value = null

  try {
    await flavorDescriptorsStore.add({
      name,
      level: form.level.trim(),
      category: form.category.trim() || null,
    })
    newDescriptorName.value = ''
  } catch (error) {
    feedback.value = (error as Error).message || 'Failed to add descriptor.'
  } finally {
    isAdding.value = false
  }
}

async function handleRemoveDescriptor(id: string, name: string) {
  const confirmed = window.confirm(`Remove ${name}? This action cannot be undone.`)
  if (!confirmed) return

  try {
    await flavorDescriptorsStore.remove(id)
    if (groupDescriptors.value.length === 0) {
      emit('groupCleared')
      closeDialog()
    }
  } catch (error) {
    feedback.value = (error as Error).message || 'Failed to remove descriptor.'
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Edit flavor group</DialogTitle>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="handleUpdateGroup">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="editLevel">Level</Label>
            <Input id="editLevel" v-model="form.level" placeholder="e.g. primary" required />
          </div>
          <div class="space-y-2">
            <Label for="editCategory">Category</Label>
            <Input id="editCategory" v-model="form.category" placeholder="e.g. fruit" />
          </div>
        </div>

        <div class="rounded-lg border border-border p-4">
          <p class="text-sm font-medium text-foreground">Descriptors in this group</p>
          <p v-if="!groupDescriptors.length" class="mt-2 text-sm text-muted-foreground">
            No descriptors in this group yet.
          </p>
          <div v-else class="mt-3 grid gap-2">
            <div
              v-for="descriptor in groupDescriptors"
              :key="descriptor.id"
              class="flex items-center justify-between rounded-md border border-border/60 px-3 py-2"
            >
              <span class="text-sm font-medium text-foreground">{{ descriptor.name }}</span>
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
              <Label for="newDescriptor">Add descriptor</Label>
              <Input
                id="newDescriptor"
                v-model="newDescriptorName"
                placeholder="Descriptor name"
              />
            </div>
            <Button type="button" :disabled="isAdding" @click="handleAddDescriptor">
              {{ isAdding ? 'Adding...' : 'Add' }}
            </Button>
          </div>
        </div>

        <p v-if="feedback" class="text-sm text-destructive">{{ feedback }}</p>

        <DialogFooter>
          <Button type="submit" :disabled="isSaving || !groupDescriptors.length">
            {{ isSaving ? 'Saving...' : 'Save group' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
