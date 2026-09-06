<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import WineCountriesTable from '@/components/WineCountries/WineCountriesTable.vue'
import CreateCountryDialog from '@/components/WineCountries/CreateCountryDialog.vue'
import EditCountryDialog from '@/components/WineCountries/EditCountryDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useFeedback } from '@/composables/useFeedback'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const { countries } = storeToRefs(wineCountriesStore)
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const selectedCountryId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditCountryDialog> | null>(null)
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(async () => {
  await Promise.all([wineCountriesStore.loadAll(), wineRegionsStore.loadAll()])
})

async function handleDelete(id: string) {
  const country = countries.value.find((c) => c.id === id)
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete country',
    body: country
      ? `${country.name} and its place in the register will be removed. This cannot be undone.`
      : 'This country will be removed from the register. This cannot be undone.',
  })
  if (!confirmed) return

  clearFeedback()
  try {
    await wineCountriesStore.remove(id)
    if (selectedCountryId.value === id) selectedCountryId.value = countries.value[0]?.id ?? null
    setSuccess('Country removed.')
  } catch (error) {
    setError(error, 'Failed to delete country.')
  }
}

function openEditDialog(id: string) {
  selectedCountryId.value = id
  editDialogRef.value?.openDialog()
}
</script>

<template>
  <div>
    <ManageHeader
      title="Wine countries"
      note="Reference data is publicly readable and admin-writable. Countries anchor every region and appellation in the encyclopedia."
    >
      <template #actions>
        <CreateCountryDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <WineCountriesTable
      @editCountry="openEditDialog($event)"
      @deleteCountry="handleDelete($event)"
    />
    <FeedbackBanner :feedback="feedback" class="mt-4" />

    <EditCountryDialog ref="editDialogRef" :country-id="selectedCountryId" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
