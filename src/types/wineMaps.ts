// src/types/wineMaps.ts
export type WineMapScope = 'country' | 'region' | 'appellation'

/**
 * Overlay layers drawn on top of a map's areas. They are Inkscape layers inside the map's one SVG,
 * recognised by their name: a layer called `water` or `places`.
 */
export type WineMapOverlayKind = 'water' | 'places'
export type WineMapElementSize = 'sm' | 'md' | 'lg'

export interface WineMapDefinitionRecord {
  id: string
  key: string
  name: string
  scope: WineMapScope

  owner_wine_country_id: string | null
  owner_wine_region_id: string | null
  owner_wine_appellation_id: string | null

  active_asset_version_id: string | null
  is_active: boolean

  created_at: string
  updated_at: string
}

export interface WineMapAssetVersionRecord {
  id: string
  map_definition_id: string
  version_number: number
  svg_asset_path: string
  original_filename: string | null
  checksum: string | null
  notes: string | null
  created_at: string
}

export interface WineMapLayerRecord {
  id: string
  map_definition_id: string
  kind: WineMapOverlayKind
  is_enabled: boolean
  default_visible: boolean
  stack: number
  opacity: number
  style: Record<string, unknown>
  created_at: string
  updated_at: string
}

/**
 * Per-element override for an overlay SVG, keyed by `svg_element_id`.
 * In the places layer a place is the row of its text; `dot_svg_element_id` is its dot.
 */
export interface WineMapLayerElementRecord {
  id: string
  map_layer_id: string
  svg_element_id: string
  dot_svg_element_id: string | null
  display_text: string | null
  subtype: string | null
  size_class: WineMapElementSize
  is_visible: boolean
  metadata: Record<string, unknown>
  source_asset_version_id: string | null
  last_seen_in_asset_version_id: string | null
  created_at: string
  updated_at: string
}

export interface WineMapAreaRecord {
  id: string
  map_definition_id: string
  svg_area_id: string
  label: string | null

  is_clickable: boolean
  is_decorative: boolean
  is_visible: boolean

  target_wine_country_id: string | null
  target_wine_region_id: string | null
  target_wine_appellation_id: string | null

  metadata: Record<string, unknown>

  source_asset_version_id?: string | null
  last_seen_in_asset_version_id?: string | null

  created_at: string
  updated_at: string
}

export interface WineMapAreaDto {
  id: string
  svgAreaId: string
  label: string | null
  isClickable: boolean
  isDecorative: boolean
  target: null | {
    type: 'country' | 'region' | 'appellation'
    id: string
  }
}

export interface WineMapLayerElementDto {
  svgElementId: string
  dotSvgElementId: string | null
  displayText: string | null
  subtype: string | null
  sizeClass: WineMapElementSize
  isVisible: boolean
}

/** Settings of an overlay layer (the layer itself comes from the map's SVG). Sorted by `stack`. */
export interface WineMapLayerDto {
  id: string
  kind: WineMapOverlayKind
  isEnabled: boolean
  defaultVisible: boolean
  stack: number
  opacity: number
  elements: WineMapLayerElementDto[]
}

export interface WineMapDto {
  id: string
  key: string
  name: string
  scope: WineMapScope
  svgAssetPath: string | null
  areas: WineMapAreaDto[]
  layers: WineMapLayerDto[]
}

/** An overlay ready to inject: SVG sanitised and id-prefixed, with its portal settings. */
export interface WineMapCanvasOverlay {
  id: string
  kind: WineMapOverlayKind
  markup: string
  stack: number
  opacity: number
  elements: WineMapLayerElementDto[]
}

export interface WineMapAdminLayerRecord extends WineMapLayerRecord {
  elements: WineMapLayerElementRecord[]
}

export interface WineMapAdminRecord extends WineMapDefinitionRecord {
  svgAssetPath: string | null
  areas: WineMapAreaRecord[]
  layers: WineMapAdminLayerRecord[]
}

export interface WineMapLayerUpdatePayload {
  is_enabled?: boolean
  default_visible?: boolean
  stack?: number
  opacity?: number
  style?: Record<string, unknown>
}

export interface WineMapLayerElementUpdatePayload {
  display_text?: string | null
  subtype?: string | null
  size_class?: WineMapElementSize
  is_visible?: boolean
  dot_svg_element_id?: string | null
  metadata?: Record<string, unknown>
}

/** One confirmed dot ↔ name pairing in a places layer. */
export interface WineMapDotPair {
  textElementId: string
  dotElementId: string
}

export interface WineMapAreaUpdatePayload {
  label?: string | null
  is_clickable?: boolean
  is_decorative?: boolean
  is_visible?: boolean
  target_wine_country_id?: string | null
  target_wine_region_id?: string | null
  target_wine_appellation_id?: string | null
  metadata?: Record<string, unknown>
}

export interface WineMapDefinitionUpdatePayload {
  name?: string
  key?: string
  scope?: WineMapScope
  owner_wine_country_id?: string | null
  owner_wine_region_id?: string | null
  owner_wine_appellation_id?: string | null
  is_active?: boolean
}

export interface WineCountryOption {
  id: string
  name: string
}

export interface WineRegionOption {
  id: string
  name: string
}

export interface WineAppellationOption {
  id: string
  name: string
}

export interface CreateWineMapPayload {
  key: string
  name: string
  scope: WineMapScope
  owner_wine_country_id?: string | null
  owner_wine_region_id?: string | null
  owner_wine_appellation_id?: string | null
}

/** Result of uploading a new SVG version and making it the active asset. */
export interface ReplaceWineMapAssetResult {
  assetVersion: WineMapAssetVersionRecord
  svgAssetPath: string
}

export interface SvgViewBox {
  minX: number
  minY: number
  width: number
  height: number
}

export interface ResolvedWineMapAreaResult {
  resolved: boolean
  reason?: string
  area?: {
    id: string
    svgAreaId: string
    label: string | null
    isClickable: boolean
    isDecorative: boolean
  }
  target?: {
    type: 'country' | 'region' | 'appellation'
    id: string
    name: string
  } | null
}

export interface ImportWineMapAreasResult {
  importedKeys: string[]
  createdCount: number
  existingCount: number
  totalCount: number
}

export interface ImportWineMapLayerElementsResult {
  kind: WineMapOverlayKind
  importedKeys: string[]
  createdCount: number
  existingCount: number
  totalCount: number
  /** Rows whose SVG element is no longer in the layer. */
  missingKeys: string[]
  /** Keys shared by several SVG elements (give them unique labels in Inkscape). */
  duplicateKeys: string[]
}

/** Everything read from a map's SVG in one go: its areas and each overlay layer found in it. */
export interface ImportWineMapSvgResult {
  areas: ImportWineMapAreasResult
  layers: ImportWineMapLayerElementsResult[]
}
