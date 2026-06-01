import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WineCountryRecord,
  WineCountryCreatePayload,
  WineCountryUpdatePayload,
} from '@/types/wineCountries'
import {
  fetchWineCountries,
  createWineCountry,
  updateWineCountry,
  deleteWineCountry,
} from '@/services/wineCountries'

function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name))
}

export const useWineCountriesStore = defineStore('wineCountries', () => {
  const countries = ref<WineCountryRecord[]>([])
  const loading = ref(false)

  async function loadAll() {
    loading.value = true
    try {
      const data = await fetchWineCountries()
      countries.value = sortByName(data)
      return countries.value
    } finally {
      loading.value = false
    }
  }

  async function create(payload: WineCountryCreatePayload) {
    const country = await createWineCountry(payload)
    countries.value = sortByName([...countries.value, country])
    return country
  }

  async function update(id: string, payload: WineCountryUpdatePayload) {
    const updated = await updateWineCountry(id, payload)
    countries.value = sortByName(countries.value.map((c) => (c.id === updated.id ? updated : c)))
    return updated
  }

  async function remove(id: string) {
    await deleteWineCountry(id)
    countries.value = countries.value.filter((c) => c.id !== id)
  }

  return { countries, loading, loadAll, create, update, remove }
})
