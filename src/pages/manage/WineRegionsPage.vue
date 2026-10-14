<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import WineRegionsTable from '@/components/WineRegions/WineRegionsTable.vue'
import CreateRegionDialog from '@/components/WineRegions/CreateRegionDialog.vue'
import EditRegionDialog from '@/components/WineRegions/EditRegionDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import OriginFilter from '@/components/manage/OriginFilter.vue'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useFeedback } from '@/composables/useFeedback'
import { ALL_FILTER, filterRegionsByCountry } from '@/lib/manageFilters'

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { allRegions: regions } = storeToRefs(wineRegionsStore)
const { allAppellations } = storeToRefs(wineAppellationsStore)
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const selectedRegionId = ref<string | null>(null)
const countryFilter = ref(ALL_FILTER)
const filteredRegions = computed(() => filterRegionsByCountry(regions.value, countryFilter.value))
const pendingId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditRegionDialog> | null>(null)
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

onMounted(async () => {
  await Promise.all([
    wineCountriesStore.loadAll(),
    wineRegionsStore.loadAll(),
    wineAppellationsStore.loadAll(),
  ])
})

async function handleToggleActive(id: string, value: boolean) {
  const region = regions.value.find((r) => r.id === id)
  const name = region?.name ?? 'Region'

  if (!value) {
    const hidden = allAppellations.value.filter((a) => a.region_id === id && a.is_active).length
    if (hidden > 0) {
      const confirmed = await confirmRef.value?.confirm({
        title: 'Hide region',
        body: `${name} and its ${hidden} active appellation${hidden === 1 ? '' : 's'} will disappear from every page outside the manage portal. Their own settings are kept and return when you switch the region back on.`,
        confirmLabel: 'Hide',
      })
      if (!confirmed) return
    }
  }

  clearFeedback()
  pendingId.value = id
  try {
    await wineRegionsStore.setActive(id, value)
    setSuccess(
      value
        ? `${name} is active again.`
        : `${name} is hidden from every page outside the manage portal.`,
    )
  } catch (error) {
    setError(error, 'Failed to update region.')
  } finally {
    pendingId.value = null
  }
}

async function handleDelete(id: string) {
  const region = regions.value.find((r) => r.id === id)
  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete region',
    body: region
      ? `${region.name} will be removed from the register. This cannot be undone.`
      : 'This region will be removed from the register. This cannot be undone.',
  })
  if (!confirmed) return

  clearFeedback()
  try {
    await wineRegionsStore.remove(id)
    if (selectedRegionId.value === id) selectedRegionId.value = regions.value[0]?.id ?? null
    setSuccess('Region removed.')
  } catch (error) {
    setError(error, 'Failed to delete region.')
  }
}

function openEditDialog(id: string) {
  selectedRegionId.value = id
  editDialogRef.value?.openDialog()
}
</script>

<template>
  <div>
    <ManageHeader
      title="Wine regions"
      note="Reference data is publicly readable and admin-writable. Each region belongs to a country and carries its own appellations."
    >
      <template #actions>
        <CreateRegionDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <OriginFilter
      v-model:country-id="countryFilter"
      :shown="filteredRegions.length"
      :total="regions.length"
    />

    <WineRegionsTable
      :regions="filteredRegions"
      :filtered="countryFilter !== ALL_FILTER"
      :pending-id="pendingId"
      @editRegion="openEditDialog($event)"
      @deleteRegion="handleDelete($event)"
      @toggleActive="handleToggleActive"
    />
    <FeedbackBanner :feedback="feedback" class="mt-4" />

    <EditRegionDialog ref="editDialogRef" :region-id="selectedRegionId" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
