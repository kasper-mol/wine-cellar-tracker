<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { storeToRefs } from 'pinia'

export interface OwnerSelectorValue {
  country_id: string | null
  region_id: string | null
  appellation_id: string | null
}

const props = defineProps<{
  modelValue: OwnerSelectorValue
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: OwnerSelectorValue): void
}>()

const countriesStore = useWineCountriesStore()
const regionsStore = useWineRegionsStore()
const appellationsStore = useWineAppellationsStore()

const { countries } = storeToRefs(countriesStore)
const { regions } = storeToRefs(regionsStore)
const { appellations } = storeToRefs(appellationsStore)
const selectedCountry = ref<string | null>(props.modelValue.country_id ?? null)
const selectedRegion = ref<string | null>(props.modelValue.region_id ?? null)
const selectedAppellation = ref<string | null>(props.modelValue.appellation_id ?? null)
const isInitializing = ref(true)

onMounted(async () => {
  if (!countries.value.length) {
    await countriesStore.loadAll()
  }

  if (selectedCountry.value && !regions.value.length) {
    await regionsStore.loadAll()
    if (selectedRegion.value && !appellations.value.length) {
      await appellationsStore.loadAll()
    }
  }

  isInitializing.value = false
})

// Watch for prop changes and sync local state
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      selectedCountry.value = newValue.country_id ?? null
      selectedRegion.value = newValue.region_id ?? null
      selectedAppellation.value = newValue.appellation_id ?? null
    }
  },
  { deep: true },
)

// Load regions whenever country changes (only clear if user changed it)
watch(
  selectedCountry,
  async (countryId, oldCountryId) => {
    // Only clear region/appellation if user actually changed the country (not on init)
    if (!isInitializing.value && oldCountryId !== null && countryId !== oldCountryId) {
      selectedRegion.value = null
      selectedAppellation.value = null
    }
    if (countryId) {
      await regionsStore.loadAll()
    }
    emitUpdate()
  },
  { immediate: false },
)

// Load appellations whenever region changes (only clear if user changed it)
watch(
  selectedRegion,
  async (regionId, oldRegionId) => {
    // Only clear appellation if user actually changed the region (not on init)
    if (!isInitializing.value && oldRegionId !== null && regionId !== oldRegionId) {
      selectedAppellation.value = null
    }
    if (regionId) {
      await appellationsStore.loadAll()
    }
    emitUpdate()
  },
  { immediate: false },
)

// Update parent v-model
watch([selectedCountry, selectedRegion, selectedAppellation], emitUpdate)

function emitUpdate() {
  emit('update:modelValue', {
    country_id: selectedCountry.value,
    region_id: selectedRegion.value,
    appellation_id: selectedAppellation.value,
  })
}

// Computed filtered lists
const filteredRegions = computed(() =>
  regionsStore.regions.filter((r) => r.country_id === selectedCountry.value),
)
const filteredAppellations = computed(() =>
  appellationsStore.appellations.filter((a) => a.region_id === selectedRegion.value),
)
</script>

<template>
  <div class="space-y-4">
    <div>
      <Label>Country</Label>
      <Select v-model="selectedCountry">
        <SelectTrigger>
          <SelectValue placeholder="Select country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="c in countriesStore.countries" :key="c.id" :value="c.id">
            {{ c.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Region</Label>
      <Select v-model="selectedRegion" :disabled="!selectedCountry">
        <SelectTrigger>
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="r in filteredRegions" :key="r.id" :value="r.id">
            {{ r.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div>
      <Label>Appellation</Label>
      <Select v-model="selectedAppellation" :disabled="!selectedRegion">
        <SelectTrigger>
          <SelectValue placeholder="Select appellation" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="a in filteredAppellations" :key="a.id" :value="a.id">
            {{ a.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</template>
