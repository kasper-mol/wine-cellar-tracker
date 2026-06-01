import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { fetchSvgText, extractSvgAreaKeys, normalizeSvgKey } from '@/lib/svgUtils'
import type {
  CreateWineMapPayload,
  ImportWineMapAreasResult,
  ResolvedWineMapAreaResult,
  WineMapAdminRecord,
  WineMapAreaDto,
  WineMapAreaRecord,
  WineMapAreaUpdatePayload,
  WineMapAssetVersionRecord,
  WineMapDefinitionRecord,
  WineMapDefinitionUpdatePayload,
  WineMapDto,
} from '@/types/wineMaps'

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

/* ----------------------------- MAPS ----------------------------- */

export async function listWineMaps() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wine_map_definitions').select('*').order('name')
  throwIfError(error)
  return (data ?? []) as WineMapDefinitionRecord[]
}

export async function getWineMapDefinitionByKey(key: string) {
  if (!key?.trim()) return null
  const db = getSupabaseClient()
  const { data, error } = await db
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
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_asset_versions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  throwIfError(error)
  return (data ?? null) as WineMapAssetVersionRecord | null
}

export async function listWineMapAreas(mapDefinitionId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
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
  const db = getSupabaseClient()
  const { data, error } = await db
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
  const db = getSupabaseClient()

  const { data: mapDefinition, error: mapError } = await db
    .from('wine_map_definitions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  throwIfError(mapError)
  if (!mapDefinition) return null

  let svgAssetPath: string | null = null
  if (mapDefinition.active_asset_version_id) {
    const { data: assetVersion, error: assetError } = await db
      .from('wine_map_asset_versions')
      .select('*')
      .eq('id', mapDefinition.active_asset_version_id)
      .maybeSingle()
    throwIfError(assetError)
    svgAssetPath = assetVersion?.svg_asset_path ?? null
  }

  const { data: areas, error: areasError } = await db
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
  const db = getSupabaseClient()

  const { data: mapDefinition, error: mapError } = await db
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

  const { data: assetVersion, error: assetError } = await db
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

  const { error: updateError } = await db
    .from('wine_map_definitions')
    .update({ active_asset_version_id: typedAsset.id })
    .eq('id', typedMap.id)
  throwIfError(updateError)

  return {
    map: { ...typedMap, active_asset_version_id: typedAsset.id },
    assetVersion: typedAsset,
  }
}

export async function updateWineMapDefinition(id: string, payload: WineMapDefinitionUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_definitions')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  throwIfError(error)
  return data as WineMapDefinitionRecord
}

export async function updateWineMapArea(id: string, payload: WineMapAreaUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
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
  const db = getSupabaseClient()

  const map = await getWineMapById(mapDefinitionId)
  if (!map) throw new Error('Wine map not found')
  if (!map.svgAssetPath) throw new Error('Wine map has no active SVG path')

  const svgText = await fetchSvgText(map.svgAssetPath)
  const importedKeys = extractSvgAreaKeys(svgText)

  if (!importedKeys.length) {
    return { importedKeys: [], createdCount: 0, existingCount: 0, totalCount: 0 }
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
    const { error } = await db.from('wine_map_area_mappings').insert(toInsert)
    throwIfError(error)
  }

  return {
    importedKeys,
    createdCount: toInsert.length,
    existingCount: importedKeys.length - toInsert.length,
    totalCount: importedKeys.length,
  }
}

/* ----------------------------- AREA RESOLUTION ----------------------------- */

export async function resolveWineMapArea(
  mapKey: string,
  svgAreaId: string,
): Promise<ResolvedWineMapAreaResult> {
  const db = getSupabaseClient()

  const mapDefinition = await getWineMapDefinitionByKey(mapKey)
  if (!mapDefinition) return { resolved: false, reason: 'Map not found' }

  const { data: area, error: areaError } = await db
    .from('wine_map_area_mappings')
    .select('*')
    .eq('map_definition_id', mapDefinition.id)
    .eq('svg_area_id', normalizeSvgKey(svgAreaId))
    .maybeSingle()
  throwIfError(areaError)

  const typedArea = area as WineMapAreaRecord | null
  if (!typedArea) return { resolved: false, reason: 'Area not found' }

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

  const areaBase = {
    id: typedArea.id,
    svgAreaId: typedArea.svg_area_id,
    label: typedArea.label,
    isClickable: typedArea.is_clickable,
    isDecorative: typedArea.is_decorative,
  }

  const targetTable = typedArea.target_wine_region_id
    ? { table: 'wine_regions', id: typedArea.target_wine_region_id, type: 'region' as const }
    : typedArea.target_wine_country_id
      ? { table: 'wine_countries', id: typedArea.target_wine_country_id, type: 'country' as const }
      : typedArea.target_wine_appellation_id
        ? {
            table: 'wine_appellations',
            id: typedArea.target_wine_appellation_id,
            type: 'appellation' as const,
          }
        : null

  if (!targetTable) return { resolved: false, reason: 'No target configured', area: areaBase }

  const { data: target, error } = await db
    .from(targetTable.table)
    .select('id, name')
    .eq('id', targetTable.id)
    .maybeSingle()
  throwIfError(error)

  return {
    resolved: Boolean(target),
    area: areaBase,
    target: target ? { type: targetTable.type, id: target.id, name: target.name } : null,
  }
}
