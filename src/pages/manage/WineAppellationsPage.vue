<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WineAppellationsTable from '@/components/WineAppellations/WineAppellationsTable.vue'
import CreateAppellationDialog from '@/components/WineAppellations/CreateAppellationsDialog.vue'
import EditAppellationDialog from '@/components/WineAppellations/EditAppellationsDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { useFeedback } from '@/composables/useFeedback'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const wineGrapeVaritiesStore = useWineGrapeVarietiesStore()
const { feedback, setSuccess, setError } = useFeedback()

const selectedAppellationId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditAppellationDialog> | null>(null)
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(async () => {
  await wineCountriesStore.loadAll()
  await wineRegionsStore.loadAll()
  await wineAppellationsStore.loadAll()
  await wineGrapeVaritiesStore.loadAll()
})

function handleEditAppellation(id: string) {
  selectedAppellationId.value = id
  editDialogRef.value?.openDialog()
}

async function handleDeleteAppellation(id: string) {
  if (!id) return
  const app = wineAppellationsStore.appellations.find((a) => a.id === id)
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete appellation',
    body: app
      ? `${app.name} and its grape rules will be removed. This cannot be undone.`
      : 'This appellation and its grape rules will be removed. This cannot be undone.',
  })
  if (!confirmed) return

  try {
    await wineAppellationsStore.remove(id)
    if (selectedAppellationId.value === id) selectedAppellationId.value = null
    setSuccess('Appellation removed.')
  } catch (error) {
    setError(error, 'Failed to delete appellation.')
  }
}
</script>

<template>
  <div>
    <ManageHeader
      title="Appellations"
      note="Appellations are mapped to their region and carry the grape rules read by the encyclopedia."
    >
      <template #actions>
        <CreateAppellationDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <WineAppellationsTable
      @editAppellation="handleEditAppellation"
      @deleteAppellation="handleDeleteAppellation"
    />
    <FeedbackBanner :feedback="feedback" class="mt-4" />

    <EditAppellationDialog
      ref="editDialogRef"
      :appellationId="selectedAppellationId || undefined"
    />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
