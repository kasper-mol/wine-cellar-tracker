<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import WineCountriesTable from '@/components/WineCountries/WineCountriesTable.vue'

import CreateCountryDialog from '@/components/WineCountries/CreateCountryDialog.vue'
import EditCountryDialog from '@/components/WineCountries/EditCountryDialog.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'

const wineCountriesStore = useWineCountriesStore()
const { countries } = storeToRefs(wineCountriesStore)

const selectedCountryId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const editDialogRef = ref<InstanceType<typeof EditCountryDialog> | null>(null)

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

onMounted(async () => {
  await wineCountriesStore.loadAll()
})

async function handleDelete(id: string) {
  const country = countries.value.find((c) => c.id === id)
  const confirmed = window.confirm(
    country
      ? `Delete ${country.name}? This action cannot be undone.`
      : 'Delete this country? This action cannot be undone.',
  )
  if (!confirmed) return

  deletingId.value = id
  feedback.value = null

  try {
    await wineCountriesStore.remove(id)
    if (selectedCountryId.value === id) {
      selectedCountryId.value = countries.value[0]?.id ?? null
    }
    feedback.value = { type: 'success', message: 'Country removed.' }
  } catch (error) {
    feedback.value = { type: 'error', message: getErrorMessage(error, 'Failed to delete country.') }
  } finally {
    deletingId.value = null
  }
}

function openEditDialog(id: string) {
  selectedCountryId.value = id
  editDialogRef.value?.openDialog()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Wine regions</p>
        <h1 class="text-3xl font-semibold tracking-tight">Wine countries overview</h1>
        <p class="text-muted-foreground">
          Maintain the list of wine-producing countries available throughout the app.
        </p>
      </div>

      <CreateCountryDialog />
    </div>

    <div class="">
      <WineCountriesTable
        @editCountry="openEditDialog($event)"
        @deleteCountry="handleDelete($event)"
      />

      <div class="space-y-6">
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
      </div>
    </div>
    <EditCountryDialog ref="editDialogRef" :country-id="selectedCountryId" />
  </div>
</template>
