<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import WineRegionsTable from '@/components/WineRegions/WineRegionsTable.vue'
import CreateRegionDialog from '@/components/WineRegions/CreateRegionDialog.vue'
import EditRegionDialog from '@/components/WineRegions/EditRegionDialog.vue'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const { regions } = storeToRefs(wineRegionsStore)

const selectedRegionId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const editDialogRef = ref<InstanceType<typeof EditRegionDialog> | null>(null)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

onMounted(async () => {
  await wineCountriesStore.loadAll()
  await wineRegionsStore.loadAll()
})

async function handleDelete(id: string) {
  const region = regions.value.find((r) => r.id === id)
  const confirmed = window.confirm(
    region
      ? `Delete ${region.name}? This action cannot be undone.`
      : 'Delete this region? This action cannot be undone.',
  )
  if (!confirmed) return

  deletingId.value = id
  feedback.value = null

  try {
    await wineRegionsStore.remove(id)
    if (selectedRegionId.value === id) {
      selectedRegionId.value = regions.value[0]?.id ?? null
    }
    feedback.value = { type: 'success', message: 'Region removed.' }
  } catch (error) {
    feedback.value = { type: 'error', message: getErrorMessage(error, 'Failed to delete region.') }
  } finally {
    deletingId.value = null
  }
}

function openEditDialog(id: string) {
  selectedRegionId.value = id
  editDialogRef.value?.openDialog()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Wine regions</p>
        <h1 class="text-3xl font-semibold tracking-tight">Wine regions overview</h1>
        <p class="text-muted-foreground">
          Manage wine regions and connect them to their producing countries.
        </p>
      </div>
      <div class="flex gap-2">
        <CreateRegionDialog />
      </div>
    </div>

    <WineRegionsTable @editRegion="openEditDialog($event)" @deleteRegion="handleDelete($event)" />

    <div
      v-if="feedback"
      :class="[
        'rounded-lg border px-4 py-3 text-sm',
        feedback.type === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-destructive/40 bg-destructive/10 text-destructive',
      ]"
    >
      {{ feedback.message }}
    </div>

    <EditRegionDialog ref="editDialogRef" :region-id="selectedRegionId" />
  </div>
</template>
