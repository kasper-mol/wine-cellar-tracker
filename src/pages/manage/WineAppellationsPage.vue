<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WineAppellationsTable from '@/components/WineAppellations/WineAppellationsTable.vue'
import CreateAppellationDialog from '@/components/WineAppellations/CreateAppellationsDialog.vue'
import EditAppellationDialog from '@/components/WineAppellations/EditAppellationsDialog.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()

const selectedAppellationId = ref<string | null>(null)
const showEditDialog = ref(false)

onMounted(async () => {
  await wineCountriesStore.loadAll()
  await wineRegionsStore.loadAll()
  await wineAppellationsStore.loadAll()
})

function handleEditAppellation(id: string) {
  console.log('test')
  selectedAppellationId.value = id
  showEditDialog.value = true
}

async function handleDeleteAppellation(id: string) {
  if (!id) return
  const app = wineAppellationsStore.appellations.find((appellation) => appellation.id === id)
  const confirmed = window.confirm(
    app ? `Delete ${app.name}? This action cannot be undone.` : 'Delete this appellation?',
  )
  if (!confirmed) return

  try {
    await wineAppellationsStore.remove(id)
    if (selectedAppellationId.value === id) selectedAppellationId.value = null
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Wine appellations</p>
        <h1 class="text-3xl font-semibold tracking-tight">Wine appellations overview</h1>
        <p class="text-muted-foreground">
          Map appellations to their regions to keep catalog data consistent.
        </p>
      </div>
      <div class="flex gap-2">
        <CreateAppellationDialog />

        <EditAppellationDialog
          v-if="selectedAppellationId && showEditDialog"
          :appellationId="selectedAppellationId"
        />
      </div>
    </div>

    <div>
      <WineAppellationsTable
        @editAppellation="handleEditAppellation"
        @deleteAppellation="handleDeleteAppellation"
      />
    </div>
  </div>
</template>
