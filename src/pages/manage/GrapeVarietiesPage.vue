<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import GrapeVarietiesTable from '@/components/GrapeVarieties/GrapeVarietiesTable.vue'
import CreateGrapeDialog from '@/components/GrapeVarieties/CreateGrapeDialog.vue'
import EditGrapeDialog from '@/components/GrapeVarieties/EditGrapeDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { useFeedback } from '@/composables/useFeedback'

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const { grapeVarieties } = storeToRefs(grapeVarietiesStore)
const { feedback, setSuccess, setError } = useFeedback()

const selectedGrapeId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditGrapeDialog> | null>(null)

onMounted(() => {
  grapeVarietiesStore.loadAll()
})

function openEditDialog(id: string) {
  selectedGrapeId.value = id
  editDialogRef.value?.openDialog()
}

async function handleDelete(id: string) {
  const grape = grapeVarieties.value.find((g) => g.id === id)
  const confirmed = window.confirm(
    grape
      ? `Delete ${grape.name}? This action cannot be undone.`
      : 'Delete this grape variety? This action cannot be undone.',
  )
  if (!confirmed) return

  try {
    await grapeVarietiesStore.remove(id)
    setSuccess('Grape variety removed.')
  } catch (error) {
    setError(error, 'Failed to delete grape variety.')
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">Grape Varieties</h1>
        <p class="text-muted-foreground">Manage grape varieties used across the app.</p>
      </div>
      <div class="flex gap-2">
        <CreateGrapeDialog />
      </div>
    </div>

    <GrapeVarietiesTable @edit-grape="openEditDialog" @delete-grape="handleDelete" />
    <FeedbackBanner :feedback="feedback" />

    <EditGrapeDialog ref="editDialogRef" :grapeId="selectedGrapeId" />
  </div>
</template>
