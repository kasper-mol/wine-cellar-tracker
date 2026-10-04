import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import {
  defaultSubtypeFor,
  extractSvgAreaKeys,
  extractSvgLayerElements,
  fetchSvgText,
  normalizeSvgKey,
  splitOverlayLayers,
} from '@/lib/svgUtils'
import { uploadWineMapSvg, safeAssetName, fileChecksum } from '@/lib/storage'
import { WINE_MAP_OVERLAY_DEFAULT_STACK, WINE_MAP_OVERLAY_KINDS } from '@/content/wineMapLayers'
import type {
  CreateWineMapPayload,
  ImportWineMapAreasResult,
  ImportWineMapLayerElementsResult,
  ImportWineMapSvgResult,
  ReplaceWineMapAssetResult,
  ResolvedWineMapAreaResult,
  WineMapAdminLayerRecord,
  WineMapAdminRecord,
  WineMapAreaDto,
  WineMapAreaRecord,
  WineMapAreaUpdatePayload,
  WineMapAssetVersionRecord,
  WineMapDefinitionRecord,
  WineMapDefinitionUpdatePayload,
  WineMapDotPair,
  WineMapDto,
  WineMapLayerDto,
  WineMapLayerElementDto,
  WineMapLayerElementRecord,
  WineMapLayerElementUpdatePayload,
  WineMapLayerRecord,
  WineMapLayerUpdatePayload,
  WineMapOverlayKind,
} from '@/types/wineMaps'

type SupabaseDb = ReturnType<typeof getSupabaseClient>

/**
 * Upload an SVG file as a new asset version and make it the map's active asset.
 * Shared by createWineMap (v1) and replaceWineMapAsset (v2+).
 */
async function createActiveAssetVersion(
  db: SupabaseDb,
  mapDefinitionId: string,
  pathPrefix: string,
  versionNumber: number,
  file: File,
  notes: string | null,
): Promise<ReplaceWineMapAssetResult> {
  const path = `${pathPrefix}/v${versionNumber}-${safeAssetName(file.name)}`
  const svgAssetPath = await uploadWineMapSvg(path, file)
  const checksum = await fileChecksum(file)

  const { data, error } = await db
    .from('wine_map_asset_versions')
    .insert({
      map_definition_id: mapDefinitionId,
      version_number: versionNumber,
      svg_asset_path: svgAssetPath,
      original_filename: file.name,
      checksum,
      notes,
    })
    .select('*')
    .single()
  throwIfError(error)
  const assetVersion = data as WineMapAssetVersionRecord

  const { error: updateError } = await db
    .from('wine_map_definitions')
    .update({ active_asset_version_id: assetVersion.id })
    .eq('id', mapDefinitionId)
  throwIfError(updateError)

  return { assetVersion, svgAssetPath }
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

  const [assetVersion, areas, layers] = await Promise.all([
    mapDefinition.active_asset_version_id
      ? getWineMapAssetVersion(mapDefinition.active_asset_version_id)
      : Promise.resolve(null),
    listWineMapAreas(mapDefinition.id),
    getWineMapLayerDtos(mapDefinition.id),
  ])

  return {
    id: mapDefinition.id,
    key: mapDefinition.key,
    name: mapDefinition.name,
    scope: mapDefinition.scope,
    svgAssetPath: assetVersion?.svg_asset_path ?? null,
    areas: areas.map(toWineMapAreaDto),
    layers,
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

export async function getWineMapsForRegion(regionId: string) {
  if (!regionId?.trim()) return []
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_definitions')
    .select('*')
    .eq('owner_wine_region_id', regionId)
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
    layers: await getWineMapAdminLayers(id),
  }
}

export async function createWineMap(payload: CreateWineMapPayload, file: File) {
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

  const { assetVersion } = await createActiveAssetVersion(
    db,
    typedMap.id,
    payload.key || typedMap.id,
    1,
    file,
    null,
  )

  return {
    map: { ...typedMap, active_asset_version_id: assetVersion.id },
    assetVersion,
  }
}

/** Next version number for a map (max existing + 1, or 1 if none). */
export async function getNextAssetVersion(mapDefinitionId: string): Promise<number> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_asset_versions')
    .select('version_number')
    .eq('map_definition_id', mapDefinitionId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()
  throwIfError(error)
  return ((data?.version_number as number | undefined) ?? 0) + 1
}

/** Upload a new SVG version for an existing map and make it active. */
export async function replaceWineMapAsset(
  mapDefinitionId: string,
  mapKey: string | null,
  file: File,
  notes?: string | null,
): Promise<ReplaceWineMapAssetResult> {
  const db = getSupabaseClient()
  const versionNumber = await getNextAssetVersion(mapDefinitionId)
  return createActiveAssetVersion(
    db,
    mapDefinitionId,
    mapKey || mapDefinitionId,
    versionNumber,
    file,
    notes ?? null,
  )
}

/** All asset versions for a map, newest first. */
export async function listWineMapAssetVersions(mapDefinitionId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_asset_versions')
    .select('*')
    .eq('map_definition_id', mapDefinitionId)
    .order('version_number', { ascending: false })
  throwIfError(error)
  return (data ?? []) as WineMapAssetVersionRecord[]
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

export async function deleteWineMapArea(id: string): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_map_area_mappings').delete().eq('id', id)
  throwIfError(error)
}

async function importAreasFromSvg(
  db: SupabaseDb,
  map: WineMapAdminRecord,
  svgText: string,
): Promise<ImportWineMapAreasResult> {
  const importedKeys = extractSvgAreaKeys(svgText)

  if (!importedKeys.length) {
    return { importedKeys: [], createdCount: 0, existingCount: 0, totalCount: 0 }
  }

  const existingByKey = new Map(map.areas.map((area) => [normalizeSvgKey(area.svg_area_id), area]))
  const toInsert = importedKeys
    .filter((key) => !existingByKey.has(key))
    .map((key) => ({
      map_definition_id: map.id,
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

/**
 * Read the map's one SVG and set up everything in it: a row for each new area, and for each
 * overlay layer found (an Inkscape layer named `water` or `places`) its settings row and a row for
 * each new element. Existing rows are kept.
 */
export async function importWineMapSvg(mapDefinitionId: string): Promise<ImportWineMapSvgResult> {
  const db = getSupabaseClient()

  const map = await getWineMapById(mapDefinitionId)
  if (!map) throw new Error('Wine map not found')
  if (!map.svgAssetPath) throw new Error('Wine map has no active SVG path')

  const svgText = await fetchSvgText(map.svgAssetPath)
  const areas = await importAreasFromSvg(db, map, svgText)

  const { overlays } = splitOverlayLayers(svgText)
  const layers: ImportWineMapLayerElementsResult[] = []
  for (const kind of WINE_MAP_OVERLAY_KINDS) {
    const overlaySvg = overlays[kind]
    if (!overlaySvg) continue

    const layer = await ensureWineMapLayer(mapDefinitionId, kind)
    layers.push(await importLayerElementsFromSvg(layer, overlaySvg, map.active_asset_version_id))
  }

  return { areas, layers }
}

/* ----------------------------- OVERLAY LAYERS ----------------------------- */

const IN_FILTER_CHUNK = 100
const INSERT_CHUNK = 500

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

export function toWineMapLayerElementDto(row: WineMapLayerElementRecord): WineMapLayerElementDto {
  return {
    svgElementId: row.svg_element_id,
    dotSvgElementId: row.dot_svg_element_id,
    displayText: row.display_text,
    subtype: row.subtype,
    sizeClass: row.size_class,
    isVisible: row.is_visible,
  }
}

function normalizeLayerRecord(row: WineMapLayerRecord): WineMapLayerRecord {
  // numeric columns can arrive as strings
  return { ...row, opacity: Number(row.opacity) }
}

/** A map's overlays, bottom to top. */
export async function listWineMapLayers(mapDefinitionId: string): Promise<WineMapLayerRecord[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layers')
    .select('*')
    .eq('map_definition_id', mapDefinitionId)
    .order('stack')
    .order('kind')
  throwIfError(error)
  return ((data ?? []) as WineMapLayerRecord[]).map(normalizeLayerRecord)
}

export async function listLayerElements(layerId: string): Promise<WineMapLayerElementRecord[]> {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layer_elements')
    .select('*')
    .eq('map_layer_id', layerId)
    .order('svg_element_id')
  throwIfError(error)
  return (data ?? []) as WineMapLayerElementRecord[]
}

async function listElementsByLayerIds(layerIds: string[]) {
  const byLayer = new Map<string, WineMapLayerElementRecord[]>()
  if (!layerIds.length) return byLayer

  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layer_elements')
    .select('*')
    .in('map_layer_id', layerIds)
    .order('svg_element_id')
  throwIfError(error)

  for (const row of (data ?? []) as WineMapLayerElementRecord[]) {
    const rows = byLayer.get(row.map_layer_id) ?? []
    rows.push(row)
    byLayer.set(row.map_layer_id, rows)
  }
  return byLayer
}

/** The map's overlay settings for the public page, bottom to top. */
async function getWineMapLayerDtos(mapDefinitionId: string): Promise<WineMapLayerDto[]> {
  const layers = await listWineMapLayers(mapDefinitionId)
  if (!layers.length) return []

  const elements = await listElementsByLayerIds(layers.map((layer) => layer.id))

  return layers.map((layer) => ({
    id: layer.id,
    kind: layer.kind,
    isEnabled: layer.is_enabled,
    defaultVisible: layer.default_visible,
    stack: layer.stack,
    opacity: layer.opacity,
    elements: (elements.get(layer.id) ?? []).map(toWineMapLayerElementDto),
  }))
}

/** Every overlay of a map for the manage portal, including disabled ones. */
async function getWineMapAdminLayers(mapDefinitionId: string): Promise<WineMapAdminLayerRecord[]> {
  const layers = await listWineMapLayers(mapDefinitionId)
  if (!layers.length) return []

  const elements = await listElementsByLayerIds(layers.map((layer) => layer.id))
  return layers.map((layer) => ({ ...layer, elements: elements.get(layer.id) ?? [] }))
}

async function getWineMapLayer(mapDefinitionId: string, kind: WineMapOverlayKind) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layers')
    .select('*')
    .eq('map_definition_id', mapDefinitionId)
    .eq('kind', kind)
    .maybeSingle()
  throwIfError(error)
  return data ? normalizeLayerRecord(data as WineMapLayerRecord) : null
}

/** The map's layer of this kind, created with defaults on first use. */
export async function ensureWineMapLayer(
  mapDefinitionId: string,
  kind: WineMapOverlayKind,
): Promise<WineMapLayerRecord> {
  const existing = await getWineMapLayer(mapDefinitionId, kind)
  if (existing) return existing

  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layers')
    .insert({
      map_definition_id: mapDefinitionId,
      kind,
      stack: WINE_MAP_OVERLAY_DEFAULT_STACK[kind],
    })
    .select('*')
    .single()

  if (error?.code === '23505') {
    // created concurrently between our read and insert
    const created = await getWineMapLayer(mapDefinitionId, kind)
    if (created) return created
  }
  throwIfError(error)
  return normalizeLayerRecord(data as WineMapLayerRecord)
}

export async function updateWineMapLayer(id: string, payload: WineMapLayerUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layers')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  throwIfError(error)
  return normalizeLayerRecord(data as WineMapLayerRecord)
}

export async function updateLayerElement(id: string, payload: WineMapLayerElementUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_map_layer_elements')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()
  throwIfError(error)
  return data as WineMapLayerElementRecord
}

export async function deleteLayerElement(id: string): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_map_layer_elements').delete().eq('id', id)
  throwIfError(error)
}

/**
 * Add a row for every element of an overlay layer that has none yet. Water gets a row per text and
 * shape; places only per text (a dot is reached through its name's `dot_svg_element_id`). Existing
 * rows are kept and only marked as seen in this version of the map.
 */
async function importLayerElementsFromSvg(
  layer: WineMapLayerRecord,
  overlaySvg: string,
  assetVersionId: string | null,
): Promise<ImportWineMapLayerElementsResult> {
  const db = getSupabaseClient()

  const { elements: extracted, duplicateKeys } = extractSvgLayerElements(overlaySvg)
  const elements =
    layer.kind === 'places' ? extracted.filter((element) => element.type === 'text') : extracted

  const existing = await listLayerElements(layer.id)
  const existingKeys = new Set(existing.map((row) => row.svg_element_id))
  const importedKeys = elements.map((element) => element.key)
  const seenKeys = new Set(importedKeys)

  const toInsert = elements
    .filter((element) => !existingKeys.has(element.key))
    .map((element) => ({
      map_layer_id: layer.id,
      svg_element_id: element.key,
      display_text: element.text,
      subtype: defaultSubtypeFor(element, layer.kind),
      source_asset_version_id: assetVersionId,
      last_seen_in_asset_version_id: assetVersionId,
    }))

  for (const rows of chunk(toInsert, INSERT_CHUNK)) {
    const { error } = await db.from('wine_map_layer_elements').insert(rows)
    throwIfError(error)
  }

  if (assetVersionId) {
    const keptKeys = importedKeys.filter((key) => existingKeys.has(key))
    for (const keys of chunk(keptKeys, IN_FILTER_CHUNK)) {
      const { error } = await db
        .from('wine_map_layer_elements')
        .update({ last_seen_in_asset_version_id: assetVersionId })
        .eq('map_layer_id', layer.id)
        .in('svg_element_id', keys)
      throwIfError(error)
    }
  }

  return {
    kind: layer.kind,
    importedKeys,
    createdCount: toInsert.length,
    existingCount: importedKeys.length - toInsert.length,
    totalCount: importedKeys.length,
    missingKeys: existing.map((row) => row.svg_element_id).filter((key) => !seenKeys.has(key)),
    duplicateKeys,
  }
}

/**
 * Replace a places layer's dot ↔ name pairing with exactly `pairs`. Dots are cleared first because
 * a dot belongs to one name at a time; if the second step fails the pairs are gone and the
 * caller should apply them again.
 */
export async function replaceLayerDotPairs(layerId: string, pairs: WineMapDotPair[]) {
  const db = getSupabaseClient()

  const { error: clearError } = await db
    .from('wine_map_layer_elements')
    .update({ dot_svg_element_id: null })
    .eq('map_layer_id', layerId)
    .not('dot_svg_element_id', 'is', null)
  throwIfError(clearError)

  for (const rows of chunk(pairs, INSERT_CHUNK)) {
    const { error } = await db.from('wine_map_layer_elements').upsert(
      rows.map((pair) => ({
        map_layer_id: layerId,
        svg_element_id: pair.textElementId,
        dot_svg_element_id: pair.dotElementId,
      })),
      { onConflict: 'map_layer_id,svg_element_id' },
    )
    throwIfError(error)
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
