import type { WineCountryRecord } from '@/types/wineCountries'

export interface WineRegionRecord {
  id: string
  name: string
  country_id: string
  image_url: string | null
  created_at: string
  updated_at: string
  country?: WineCountryRecord | null
}

export interface WineRegionCreatePayload {
  name: string
  country_id: string
  imageFile?: File | null
}

export interface WineRegionUpdatePayload {
  name?: string
  country_id?: string
  imageFile?: File | null
}
