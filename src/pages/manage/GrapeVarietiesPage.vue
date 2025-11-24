<script setup lang="ts">
import { onMounted, ref } from 'vue'

import GrapeVarietiesTable from '@/components/GrapeVarieties/GrapeVarietiesTable.vue'
import CreateGrapeDialog from '@/components/GrapeVarieties/CreateGrapeDialog.vue'
import EditGrapeDialog from '@/components/GrapeVarieties/EditGrapeDialog.vue'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { storeToRefs } from 'pinia'

const selectedGrapeId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditGrapeDialog> | null>(null)
const wineGeographyStore = useWineGrapeVarietiesStore()

const grapeVarietiesStore = useWineGrapeVarietiesStore()

const { grapeVarieties } = storeToRefs(grapeVarietiesStore)

onMounted(() => {
  wineGeographyStore.loadAll()
})

function openEditDialog(id: string) {
  selectedGrapeId.value = id
  editDialogRef.value?.openDialog()
}

async function handleDelete(id: string) {
  const selectedGrape = grapeVarieties.value.find((grape) => grape.id === id)
  const confirmed = window.confirm(
    selectedGrape
      ? `Delete ${selectedGrape.name}? This action cannot be undone.`
      : 'Delete this country? This action cannot be undone.',
  )
  if (!confirmed) return

  await wineGeographyStore.remove(id)
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

    <GrapeVarietiesTable ref="table" @edit-grape="openEditDialog" @delete-grape="handleDelete" />

    <EditGrapeDialog ref="editDialogRef" :grapeId="selectedGrapeId" />
  </div>
</template>
