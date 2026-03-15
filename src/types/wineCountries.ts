export interface WineCountryRecord {
  id: string
  name: string
  code: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export interface WineCountryCreatePayload {
  name: string
  code?: string | null
  imageFile?: File | null
}

export interface WineCountryUpdatePayload {
  name?: string
  code?: string | null
  imageFile?: File | null
}
