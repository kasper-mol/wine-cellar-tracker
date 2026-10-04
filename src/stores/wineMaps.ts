import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createWineMap,
  deleteLayerElement,
  ensureWineMapLayer,
  deleteWineMapArea,
  getWineMapById,
  getWineMapByKey,
  getWineMapsForCountry,
  getWineMapsForRegion,
  importWineMapSvg,
  listLayerElements,
  listWineMaps,
  listWineMapAssetVersions,
  replaceLayerDotPairs,
  replaceWineMapAsset,
  resolveWineMapArea,
  updateLayerElement,
  updateWineMapArea,
  updateWineMapDefinition,
  updateWineMapLayer,
} from '@/services/wineMaps'
import { isValidWineMapSubtype } from '@/content/wineMapLayers'
import { fetchWineCountries } from '@/services/wineCountries'
import { fetchWineRegions } from '@/services/wineRegions'
import { fetchWineAppellations } from '@/services/wineAppellations'
import type {
  CreateWineMapPayload,
  WineMapAdminLayerRecord,
  WineMapAdminRecord,
  WineMapAreaRecord,
  WineMapAreaUpdatePayload,
  WineMapAssetVersionRecord,
  WineMapDefinitionRecord,
  WineMapDefinitionUpdatePayload,
  WineMapDotPair,
  WineMapDto,
  WineMapLayerElementRecord,
  WineMapLayerElementUpdatePayload,
  WineMapLayerUpdatePayload,
  WineMapOverlayKind,
} from '@/types/wineMaps'
import type { WineCountryRecord } from '@/types/wineCountries'
import type { WineRegionRecord } from '@/types/wineRegions'
import type { WineAppellationRecord } from '@/types/wineAppellations'

export const useWineMapsStore = defineStore('wineMaps', () => {
  const maps = ref<WineMapDefinitionRecord[]>([])
  const currentMap = ref<WineMapDto | null>(null)

  const adminMap = ref<WineMapAdminRecord | null>(null)
  const assetVersions = ref<WineMapAssetVersionRecord[]>([])
  const selectedAreaId = ref<string | null>(null)

  const countries = ref<WineCountryRecord[]>([])
  const regions = ref<WineRegionRecord[]>([])
  const appellations = ref<WineAppellationRecord[]>([])

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

  async function fetchMapsForRegion(regionId: string) {
    loading.value = true
    try {
      maps.value = await getWineMapsForRegion(regionId)
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
      assetVersions.value = await listWineMapAssetVersions(id)
      selectedAreaId.value = null
    } finally {
      loading.value = false
    }
  }

  async function loadTargetOptions() {
    const [countryData, regionData, appellationData] = await Promise.all([
      fetchWineCountries(),
      fetchWineRegions(),
      fetchWineAppellations(),
    ])

    countries.value = countryData
    regions.value = regionData
    appellations.value = appellationData
  }

  async function addWineMap(payload: CreateWineMapPayload, file: File) {
    const created = await createWineMap(payload, file)

    maps.value.push(created.map)
    maps.value.sort((a, b) => a.name.localeCompare(b.name))

    return created
  }

  async function replaceMapAsset(file: File, notes?: string | null) {
    if (!adminMap.value) throw new Error('No admin map loaded')

    const result = await replaceWineMapAsset(
      adminMap.value.id,
      adminMap.value.key,
      file,
      notes ?? null,
    )

    // Refresh the admin map (new svgAssetPath + active version) and version history in place.
    adminMap.value = await getWineMapById(adminMap.value.id)
    assetVersions.value = await listWineMapAssetVersions(result.assetVersion.map_definition_id)

    return result
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

  /** Read the map's SVG: add rows for new areas, and for the `water` / `places` layers in it. */
  async function importSvgForAdminMap() {
    if (!adminMap.value) {
      throw new Error('No admin map loaded')
    }

    const result = await importWineMapSvg(adminMap.value.id)
    adminMap.value = await getWineMapById(adminMap.value.id)
    return result
  }

  function adminLayer(kind: WineMapOverlayKind): WineMapAdminLayerRecord | null {
    return adminMap.value?.layers.find((layer) => layer.kind === kind) ?? null
  }

  function requireAdminLayer(layerId: string): WineMapAdminLayerRecord {
    const layer = adminMap.value?.layers.find((item) => item.id === layerId)
    if (!layer) throw new Error('Wine map layer not loaded')
    return layer
  }

  /** The settings row for an overlay found in the SVG, created with defaults if it is new. */
  async function ensureLayer(kind: WineMapOverlayKind): Promise<WineMapAdminLayerRecord> {
    const map = adminMap.value
    if (!map) throw new Error('No admin map loaded')

    const existing = adminLayer(kind)
    if (existing) return existing

    const created = await ensureWineMapLayer(map.id, kind)
    // A concurrent call may have added the row while we waited.
    const raced = map.layers.find((layer) => layer.kind === kind)
    if (raced) return raced

    const layer: WineMapAdminLayerRecord = { ...created, elements: [] }
    map.layers.push(layer)
    return layer
  }

  async function saveLayer(layerId: string, payload: WineMapLayerUpdatePayload) {
    const updated = await updateWineMapLayer(layerId, payload)

    const layer = requireAdminLayer(layerId)
    Object.assign(layer, updated)

    return updated
  }

  async function reloadLayerElements(layerId: string) {
    requireAdminLayer(layerId).elements = await listLayerElements(layerId)
  }

  async function saveLayerElement(
    layerId: string,
    elementId: string,
    payload: WineMapLayerElementUpdatePayload,
  ): Promise<WineMapLayerElementRecord> {
    const layer = requireAdminLayer(layerId)
    if (payload.subtype && !isValidWineMapSubtype(layer.kind, payload.subtype)) {
      throw new Error(`"${payload.subtype}" is not a ${layer.kind} subtype`)
    }

    const updated = await updateLayerElement(elementId, payload)

    const index = layer.elements.findIndex((element) => element.id === elementId)
    if (index !== -1) layer.elements[index] = updated

    return updated
  }

  async function removeLayerElement(layerId: string, elementId: string) {
    await deleteLayerElement(elementId)

    const layer = requireAdminLayer(layerId)
    layer.elements = layer.elements.filter((element) => element.id !== elementId)
  }

  /** Replace the places layer's dot ↔ name pairing with exactly these pairs. */
  async function applyDotPairs(layerId: string, pairs: WineMapDotPair[]) {
    await replaceLayerDotPairs(layerId, pairs)
    await reloadLayerElements(layerId)
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

  async function deleteArea(areaId: string) {
    await deleteWineMapArea(areaId)

    if (adminMap.value) {
      adminMap.value.areas = adminMap.value.areas.filter((area) => area.id !== areaId)
    }
    if (selectedAreaId.value === areaId) {
      selectedAreaId.value = null
    }
  }

  function clearCurrentMap() {
    currentMap.value = null
  }

  return {
    maps,
    currentMap,
    adminMap,
    assetVersions,
    selectedAreaId,
    selectedArea,
    countries,
    regions,
    appellations,
    loading,
    fetchMaps,
    fetchMapsForCountry,
    fetchMapsForRegion,
    loadMap,
    resolveArea,
    loadAdminMap,
    loadTargetOptions,
    addWineMap,
    replaceMapAsset,
    saveMapDefinition,
    importSvgForAdminMap,
    adminLayer,
    ensureLayer,
    saveLayer,
    saveLayerElement,
    removeLayerElement,
    applyDotPairs,
    selectAreaByRowId,
    selectAreaBySvgAreaId,
    saveArea,
    deleteArea,
    clearCurrentMap,
  }
})
