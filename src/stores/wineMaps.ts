// src/stores/wineMaps.ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createWineMap,
  getWineMapById,
  getWineMapByKey,
  getWineMapsForCountry,
  importWineMapAreas,
  listWineAppellations,
  listWineCountries,
  listWineMaps,
  listWineRegions,
  resolveWineMapArea,
  updateWineMapArea,
  updateWineMapDefinition,
} from '@/services/wineMaps'
import type {
  CreateWineMapPayload,
  WineAppellationOption,
  WineCountryOption,
  WineMapAdminRecord,
  WineMapAreaRecord,
  WineMapAreaUpdatePayload,
  WineMapDefinitionRecord,
  WineMapDefinitionUpdatePayload,
  WineMapDto,
  WineRegionOption,
} from '@/types/wineMaps'

export const useWineMapsStore = defineStore('wineMaps', () => {
  const maps = ref<WineMapDefinitionRecord[]>([])
  const currentMap = ref<WineMapDto | null>(null)

  const adminMap = ref<WineMapAdminRecord | null>(null)
  const selectedAreaId = ref<string | null>(null)

  const countries = ref<WineCountryOption[]>([])
  const regions = ref<WineRegionOption[]>([])
  const appellations = ref<WineAppellationOption[]>([])

  const loading = ref(false)

  const selectedArea = computed<WineMapAreaRecord | null>(() => {
    if (!adminMap.value || !selectedAreaId.value) return null
    return adminMap.value.areas.find((area) => area.id === selectedAreaId.value) ?? null
  })

  async function fetchMaps() {
    loading.value = true
    try {
      maps.value = await listWineMaps()
    } finally {
      loading.value = false
    }
  }

  async function fetchMapsForCountry(countryId: string) {
    loading.value = true
    try {
      maps.value = await getWineMapsForCountry(countryId)
    } finally {
      loading.value = false
    }
  }

  async function loadMap(key: string) {
    loading.value = true
    try {
      currentMap.value = await getWineMapByKey(key)
    } finally {
      loading.value = false
    }
  }

  async function resolveArea(svgAreaId: string) {
    if (!currentMap.value) return null
    return await resolveWineMapArea(currentMap.value.key, svgAreaId)
  }

  async function loadAdminMap(id: string) {
    loading.value = true
    try {
      adminMap.value = await getWineMapById(id)
      selectedAreaId.value = null
    } finally {
      loading.value = false
    }
  }

  async function loadTargetOptions() {
    const [countryData, regionData, appellationData] = await Promise.all([
      listWineCountries(),
      listWineRegions(),
      listWineAppellations(),
    ])

    countries.value = countryData
    regions.value = regionData
    appellations.value = appellationData
  }

  async function addWineMap(payload: CreateWineMapPayload) {
    const created = await createWineMap(payload)

    maps.value.push(created.map)
    maps.value.sort((a, b) => a.name.localeCompare(b.name))

    return created
  }

  async function saveMapDefinition(id: string, payload: WineMapDefinitionUpdatePayload) {
    const updated = await updateWineMapDefinition(id, payload)

    if (adminMap.value?.id === id) {
      adminMap.value = {
        ...adminMap.value,
        ...updated,
      }
    }

    const index = maps.value.findIndex((map) => map.id === id)
    if (index !== -1) {
      maps.value[index] = {
        ...maps.value[index],
        ...updated,
      }
    }

    return updated
  }

  async function importAreasForAdminMap() {
    if (!adminMap.value) {
      throw new Error('No admin map loaded')
    }

    const result = await importWineMapAreas(adminMap.value.id)
    adminMap.value = await getWineMapById(adminMap.value.id)
    return result
  }

  function selectAreaByRowId(id: string | null) {
    selectedAreaId.value = id
  }

  function selectAreaBySvgAreaId(svgAreaId: string | null) {
    if (!svgAreaId || !adminMap.value) {
      selectedAreaId.value = null
      return
    }

    const normalized = svgAreaId.trim().toLowerCase()
    const match = adminMap.value.areas.find(
      (area) => area.svg_area_id.trim().toLowerCase() === normalized,
    )
    selectedAreaId.value = match?.id ?? null
  }

  async function saveArea(areaId: string, payload: WineMapAreaUpdatePayload) {
    const updated = await updateWineMapArea(areaId, payload)

    if (adminMap.value) {
      const index = adminMap.value.areas.findIndex((area) => area.id === areaId)
      if (index !== -1) {
        adminMap.value.areas[index] = updated
      }
    }

    return updated
  }

  function clearCurrentMap() {
    currentMap.value = null
  }

  return {
    maps,
    currentMap,
    adminMap,
    selectedAreaId,
    selectedArea,
    countries,
    regions,
    appellations,
    loading,
    fetchMaps,
    fetchMapsForCountry,
    loadMap,
    resolveArea,
    loadAdminMap,
    loadTargetOptions,
    addWineMap,
    saveMapDefinition,
    importAreasForAdminMap,
    selectAreaByRowId,
    selectAreaBySvgAreaId,
    saveArea,
    clearCurrentMap,
  }
})
