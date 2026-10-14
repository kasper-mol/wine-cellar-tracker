<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_FILTER, filterRegionsByCountry } from '@/lib/manageFilters'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'

const props = withDefaults(
  defineProps<{
    /** Also offer a region select (narrowed to the chosen country). */
    showRegion?: boolean
    /** "12 of 85": how many rows the filter leaves. Shown only while a filter is on. */
    shown?: number
    total?: number
  }>(),
  { showRegion: false, shown: undefined, total: undefined },
)

const countryId = defineModel<string>('countryId', { default: ALL_FILTER })
const regionId = defineModel<string>('regionId', { default: ALL_FILTER })

const { countries } = storeToRefs(useWineCountriesStore())
// The manage portal lists switched-off regions too.
const { allRegions } = storeToRefs(useWineRegionsStore())

const regionOptions = computed(() => filterRegionsByCountry(allRegions.value, countryId.value))

const isFiltered = computed(
  () => countryId.value !== ALL_FILTER || (props.showRegion && regionId.value !== ALL_FILTER),
)

// A region outside the newly chosen country, or one that was just deleted, would leave the
// table empty with nothing to explain it.
watch(regionOptions, (options) => {
  if (regionId.value === ALL_FILTER) return
  if (!options.some((region) => region.id === regionId.value)) regionId.value = ALL_FILTER
})

function clear() {
  countryId.value = ALL_FILTER
  regionId.value = ALL_FILTER
}
</script>

<template>
  <div class="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">
    <div>
      <p class="mb-1.5 text-xs text-foreground/70">Country</p>
      <Select v-model="countryId">
        <SelectTrigger class="w-[200px] max-md:w-full" aria-label="Filter by country">
          <SelectValue placeholder="All countries" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL_FILTER">All countries</SelectItem>
          <SelectItem v-for="country in countries" :key="country.id" :value="country.id">
            {{ country.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="showRegion">
      <p class="mb-1.5 text-xs text-foreground/70">Region</p>
      <Select v-model="regionId">
        <SelectTrigger class="w-[220px] max-md:w-full" aria-label="Filter by region">
          <SelectValue placeholder="All regions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL_FILTER">All regions</SelectItem>
          <SelectItem v-for="region in regionOptions" :key="region.id" :value="region.id">
            {{ region.name }}{{ region.is_active ? '' : ' · inactive' }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="isFiltered" class="flex items-center gap-3 pb-2 text-sm">
      <span v-if="shown !== undefined && total !== undefined" class="num text-foreground/[0.6]">
        {{ shown }} of {{ total }}
      </span>
      <button
        type="button"
        class="text-accent-700 underline decoration-dotted underline-offset-2 hover:text-accent-800"
        @click="clear"
      >
        Clear filter
      </button>
    </div>
  </div>
</template>
