<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import GrapeVarietiesTable from '@/components/GrapeVarieties/GrapeVarietiesTable.vue'
import CreateGrapeDialog from '@/components/GrapeVarieties/CreateGrapeDialog.vue'
import EditGrapeDialog from '@/components/GrapeVarieties/EditGrapeDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { useFeedback } from '@/composables/useFeedback'

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const { grapeVarieties } = storeToRefs(grapeVarietiesStore)
const { feedback, setSuccess, setError } = useFeedback()

const selectedGrapeId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditGrapeDialog> | null>(null)
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(() => {
  grapeVarietiesStore.loadAll()
})

function openEditDialog(id: string) {
  selectedGrapeId.value = id
  editDialogRef.value?.openDialog()
}

async function handleDelete(id: string) {
  const grape = grapeVarieties.value.find((g) => g.id === id)
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete grape variety',
    body: grape
      ? `${grape.name} will be removed, along with its appellation rules. This cannot be undone.`
      : 'This grape variety will be removed. This cannot be undone.',
  })
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
  <div>
    <ManageHeader
      title="Grape varieties"
      note="The varieties the appellation rules draw on. Names are shared across the whole register."
    >
      <template #actions>
        <CreateGrapeDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <GrapeVarietiesTable @edit-grape="openEditDialog" @delete-grape="handleDelete" />
    <FeedbackBanner :feedback="feedback" class="mt-4" />

    <EditGrapeDialog ref="editDialogRef" :grapeId="selectedGrapeId" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
