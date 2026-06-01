// src/types/wineMaps.ts
export type WineMapScope = 'country' | 'region' | 'appellation'

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

export interface WineMapDto {
  id: string
  key: string
  name: string
  scope: WineMapScope
  svgAssetPath: string | null
  areas: WineMapAreaDto[]
}

export interface WineMapAdminRecord extends WineMapDefinitionRecord {
  svgAssetPath: string | null
  areas: WineMapAreaRecord[]
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
  svgAssetPath: string
  owner_wine_country_id?: string | null
  owner_wine_region_id?: string | null
  owner_wine_appellation_id?: string | null
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
