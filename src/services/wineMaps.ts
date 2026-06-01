// src/services/wineMaps.ts
import type { PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type {
  CreateWineMapPayload,
  ImportWineMapAreasResult,
  ResolvedWineMapAreaResult,
  WineAppellationOption,
  WineCountryOption,
  WineMapAdminRecord,
  WineMapAreaDto,
  WineMapAreaRecord,
  WineMapAreaUpdatePayload,
  WineMapAssetVersionRecord,
  WineMapDefinitionRecord,
  WineMapDefinitionUpdatePayload,
  WineMapDto,
  WineRegionOption,
} from '@/types/wineMaps'

function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(error.message)
}

function toWineMapAreaDto(area: WineMapAreaRecord): WineMapAreaDto {
  return {
    id: area.id,
    svgAreaId: area.svg_area_id,
    label: area.label,
    isClickable: area.is_clickable,
    isDecorative: area.is_decorative,
    target: area.target_wine_region_id
      ? { type: 'region', id: area.target_wine_region_id }
      : area.target_wine_country_id
        ? { type: 'country', id: area.target_wine_country_id }
        : area.target_wine_appellation_id
          ? { type: 'appellation', id: area.target_wine_appellation_id }
          : null,
  }
}

function normalizeSvgKey(value: string) {
  return value.trim().toLowerCase()
}

function isGenericSvgId(value: string) {
  const normalized = normalizeSvgKey(value)
  return /^layer\d+$/.test(normalized) || /^path\d+$/.test(normalized) || /^g\d+$/.test(normalized)
}

function pickSvgAreaKey(el: Element): string | null {
  const label = el.getAttribute('inkscape:label') || el.getAttribute('label')
  const id = el.getAttribute('id')

  if (label && normalizeSvgKey(label).length > 0) {
    return normalizeSvgKey(label)
  }

  if (id && normalizeSvgKey(id).length > 0 && !isGenericSvgId(id)) {
    return normalizeSvgKey(id)
  }

  return null
}

async function fetchSvgText(svgAssetPath: string) {
  const response = await fetch(svgAssetPath)
  if (!response.ok) {
    throw new Error(`Failed to load SVG from ${svgAssetPath}`)
  }
  return response.text()
}

function extractSvgAreaKeys(svgText: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')

  const allElements = Array.from(doc.querySelectorAll('*'))
  const keys = new Set<string>()

  for (const el of allElements) {
    const groupMode = el.getAttribute('inkscape:groupmode')
    const hasLabel = Boolean(el.getAttribute('inkscape:label') || el.getAttribute('label'))
    const tag = el.tagName.toLowerCase()

    const isLayer = groupMode === 'layer' && hasLabel
    const isDirectShape = ['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(tag)

    if (!isLayer && !isDirectShape) continue

    const key = pickSvgAreaKey(el)
    if (!key) continue

    keys.add(key)
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}

/* ----------------------------- MAPS ----------------------------- */

export async function listWineMaps() {
  const client = getSupabaseClient()

  const { data, error } = await client.from('wine_map_definitions').select('*').order('name')

  throwIfError(error)
  return (data ?? []) as WineMapDefinitionRecord[]
}

export async function getWineMapDefinitionByKey(key: string) {
  if (!key?.trim()) return null

  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_definitions')
    .select('*')
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle()

  throwIfError(error)
  return (data ?? null) as WineMapDefinitionRecord | null
}

export async function getWineMapAssetVersion(id: string) {
  if (!id?.trim()) return null

  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_asset_versions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  throwIfError(error)
  return (data ?? null) as WineMapAssetVersionRecord | null
}

export async function listWineMapAreas(mapDefinitionId: string) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_area_mappings')
    .select('*')
    .eq('map_definition_id', mapDefinitionId)
    .order('svg_area_id')

  throwIfError(error)
  return (data ?? []) as WineMapAreaRecord[]
}

export async function getWineMapByKey(key: string): Promise<WineMapDto | null> {
  const mapDefinition = await getWineMapDefinitionByKey(key)
  if (!mapDefinition) return null

  const [assetVersion, areas] = await Promise.all([
    mapDefinition.active_asset_version_id
      ? getWineMapAssetVersion(mapDefinition.active_asset_version_id)
      : Promise.resolve(null),
    listWineMapAreas(mapDefinition.id),
  ])

  return {
    id: mapDefinition.id,
    key: mapDefinition.key,
    name: mapDefinition.name,
    scope: mapDefinition.scope,
    svgAssetPath: assetVersion?.svg_asset_path ?? null,
    areas: areas.map(toWineMapAreaDto),
  }
}

export async function getWineMapsForCountry(countryId: string) {
  if (!countryId?.trim()) return []

  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_definitions')
    .select('*')
    .eq('owner_wine_country_id', countryId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  throwIfError(error)
  return (data ?? []) as WineMapDefinitionRecord[]
}

/* ----------------------------- ADMIN ----------------------------- */

export async function getWineMapById(id: string): Promise<WineMapAdminRecord | null> {
  const client = getSupabaseClient()

  const { data: mapDefinition, error: mapError } = await client
    .from('wine_map_definitions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  throwIfError(mapError)
  if (!mapDefinition) return null

  let svgAssetPath: string | null = null

  if (mapDefinition.active_asset_version_id) {
    const { data: assetVersion, error: assetError } = await client
      .from('wine_map_asset_versions')
      .select('*')
      .eq('id', mapDefinition.active_asset_version_id)
      .maybeSingle()

    throwIfError(assetError)
    svgAssetPath = assetVersion?.svg_asset_path ?? null
  }

  const { data: areas, error: areasError } = await client
    .from('wine_map_area_mappings')
    .select('*')
    .eq('map_definition_id', id)
    .order('svg_area_id')

  throwIfError(areasError)

  return {
    ...(mapDefinition as WineMapDefinitionRecord),
    svgAssetPath,
    areas: (areas ?? []) as WineMapAreaRecord[],
  }
}

export async function createWineMap(payload: CreateWineMapPayload) {
  const client = getSupabaseClient()

  const { data: mapDefinition, error: mapError } = await client
    .from('wine_map_definitions')
    .insert({
      key: payload.key,
      name: payload.name,
      scope: payload.scope,
      owner_wine_country_id: payload.owner_wine_country_id ?? null,
      owner_wine_region_id: payload.owner_wine_region_id ?? null,
      owner_wine_appellation_id: payload.owner_wine_appellation_id ?? null,
      is_active: true,
    })
    .select('*')
    .single()

  throwIfError(mapError)

  const typedMap = mapDefinition as WineMapDefinitionRecord

  const { data: assetVersion, error: assetError } = await client
    .from('wine_map_asset_versions')
    .insert({
      map_definition_id: typedMap.id,
      version_number: 1,
      svg_asset_path: payload.svgAssetPath,
      original_filename: payload.svgAssetPath.split('/').pop() ?? null,
    })
    .select('*')
    .single()

  throwIfError(assetError)

  const typedAsset = assetVersion as WineMapAssetVersionRecord

  const { error: updateError } = await client
    .from('wine_map_definitions')
    .update({
      active_asset_version_id: typedAsset.id,
    })
    .eq('id', typedMap.id)

  throwIfError(updateError)

  return {
    map: {
      ...typedMap,
      active_asset_version_id: typedAsset.id,
    },
    assetVersion: typedAsset,
  }
}

export async function updateWineMapDefinition(id: string, payload: WineMapDefinitionUpdatePayload) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_definitions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  throwIfError(error)
  return data as WineMapDefinitionRecord
}

export async function updateWineMapArea(id: string, payload: WineMapAreaUpdatePayload) {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('wine_map_area_mappings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  throwIfError(error)
  return data as WineMapAreaRecord
}

export async function importWineMapAreas(
  mapDefinitionId: string,
): Promise<ImportWineMapAreasResult> {
  const client = getSupabaseClient()

  const map = await getWineMapById(mapDefinitionId)
  if (!map) {
    throw new Error('Wine map not found')
  }

  if (!map.svgAssetPath) {
    throw new Error('Wine map has no active SVG path')
  }

  const svgText = await fetchSvgText(map.svgAssetPath)
  const importedKeys = extractSvgAreaKeys(svgText)

  if (!importedKeys.length) {
    return {
      importedKeys: [],
      createdCount: 0,
      existingCount: 0,
      totalCount: 0,
    }
  }

  const existingByKey = new Map(map.areas.map((area) => [normalizeSvgKey(area.svg_area_id), area]))

  const toInsert = importedKeys
    .filter((key) => !existingByKey.has(key))
    .map((key) => ({
      map_definition_id: mapDefinitionId,
      svg_area_id: key,
      label: null,
      is_clickable: false,
      is_decorative: false,
      is_visible: true,
      target_wine_country_id: null,
      target_wine_region_id: null,
      target_wine_appellation_id: null,
      metadata: {},
    }))

  if (toInsert.length) {
    const { error } = await client.from('wine_map_area_mappings').insert(toInsert)
    throwIfError(error)
  }

  return {
    importedKeys,
    createdCount: toInsert.length,
    existingCount: importedKeys.length - toInsert.length,
    totalCount: importedKeys.length,
  }
}

/* ----------------------------- TARGETS ----------------------------- */

export async function listWineCountries() {
  const client = getSupabaseClient()

  const { data, error } = await client.from('wine_countries').select('id, name').order('name')

  throwIfError(error)
  return (data ?? []) as WineCountryOption[]
}

export async function listWineRegions() {
  const client = getSupabaseClient()

  const { data, error } = await client.from('wine_regions').select('id, name').order('name')

  throwIfError(error)
  return (data ?? []) as WineRegionOption[]
}

export async function listWineAppellations() {
  const client = getSupabaseClient()

  const { data, error } = await client.from('wine_appellations').select('id, name').order('name')

  throwIfError(error)
  return (data ?? []) as WineAppellationOption[]
}

/* ----------------------------- AREA RESOLUTION ----------------------------- */

export async function resolveWineMapArea(
  mapKey: string,
  svgAreaId: string,
): Promise<ResolvedWineMapAreaResult> {
  const client = getSupabaseClient()

  const mapDefinition = await getWineMapDefinitionByKey(mapKey)
  if (!mapDefinition) {
    return {
      resolved: false,
      reason: 'Map not found',
    }
  }

  const { data: area, error: areaError } = await client
    .from('wine_map_area_mappings')
    .select('*')
    .eq('map_definition_id', mapDefinition.id)
    .eq('svg_area_id', normalizeSvgKey(svgAreaId))
    .maybeSingle()

  throwIfError(areaError)

  const typedArea = area as WineMapAreaRecord | null

  if (!typedArea) {
    return {
      resolved: false,
      reason: 'Area not found',
    }
  }

  if (!typedArea.is_clickable || typedArea.is_decorative) {
    return {
      resolved: false,
      reason: 'Area is not interactive',
      area: {
        id: typedArea.id,
        svgAreaId: typedArea.svg_area_id,
        label: typedArea.label,
        isClickable: typedArea.is_clickable,
        isDecorative: typedArea.is_decorative,
      },
    }
  }

  if (typedArea.target_wine_region_id) {
    const { data: target, error } = await client
      .from('wine_regions')
      .select('id, name')
      .eq('id', typedArea.target_wine_region_id)
      .maybeSingle()

    throwIfError(error)

    return {
      resolved: Boolean(target),
      area: {
        id: typedArea.id,
        svgAreaId: typedArea.svg_area_id,
        label: typedArea.label,
        isClickable: typedArea.is_clickable,
        isDecorative: typedArea.is_decorative,
      },
      target: target
        ? {
            type: 'region',
            id: target.id,
            name: target.name,
          }
        : null,
    }
  }

  if (typedArea.target_wine_country_id) {
    const { data: target, error } = await client
      .from('wine_countries')
      .select('id, name')
      .eq('id', typedArea.target_wine_country_id)
      .maybeSingle()

    throwIfError(error)

    return {
      resolved: Boolean(target),
      area: {
        id: typedArea.id,
        svgAreaId: typedArea.svg_area_id,
        label: typedArea.label,
        isClickable: typedArea.is_clickable,
        isDecorative: typedArea.is_decorative,
      },
      target: target
        ? {
            type: 'country',
            id: target.id,
            name: target.name,
          }
        : null,
    }
  }

  if (typedArea.target_wine_appellation_id) {
    const { data: target, error } = await client
      .from('wine_appellations')
      .select('id, name')
      .eq('id', typedArea.target_wine_appellation_id)
      .maybeSingle()

    throwIfError(error)

    return {
      resolved: Boolean(target),
      area: {
        id: typedArea.id,
        svgAreaId: typedArea.svg_area_id,
        label: typedArea.label,
        isClickable: typedArea.is_clickable,
        isDecorative: typedArea.is_decorative,
      },
      target: target
        ? {
            type: 'appellation',
            id: target.id,
            name: target.name,
          }
        : null,
    }
  }

  return {
    resolved: false,
    reason: 'No target configured',
    area: {
      id: typedArea.id,
      svgAreaId: typedArea.svg_area_id,
      label: typedArea.label,
      isClickable: typedArea.is_clickable,
      isDecorative: typedArea.is_decorative,
    },
  }
}
