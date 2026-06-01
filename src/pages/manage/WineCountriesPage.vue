<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import WineCountriesTable from '@/components/WineCountries/WineCountriesTable.vue'
import CreateCountryDialog from '@/components/WineCountries/CreateCountryDialog.vue'
import EditCountryDialog from '@/components/WineCountries/EditCountryDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useFeedback } from '@/composables/useFeedback'

const wineCountriesStore = useWineCountriesStore()
const { countries } = storeToRefs(wineCountriesStore)
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const selectedCountryId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditCountryDialog> | null>(null)

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
  clearFeedback()

  try {
    await wineCountriesStore.remove(id)
    if (selectedCountryId.value === id) selectedCountryId.value = countries.value[0]?.id ?? null
    setSuccess('Country removed.')
  } catch (error) {
    setError(error, 'Failed to delete country.')
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

    <div class="space-y-4">
      <WineCountriesTable
        @editCountry="openEditDialog($event)"
        @deleteCountry="handleDelete($event)"
      />
      <FeedbackBanner :feedback="feedback" />
    </div>

    <EditCountryDialog ref="editDialogRef" :country-id="selectedCountryId" />
  </div>
</template>
