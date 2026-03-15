export type GrapeColor = 'red' | 'white' | 'rose'

export interface GrapeVarietyRecord {
  id: string
  name: string
  color: GrapeColor | null
  description: string | null
  created_at: string
  updated_at: string
  image_url: string | null
}

export interface GrapeVarietyCreatePayload {
  name: string
  color?: GrapeColor | null
  description?: string | null
  imageFile?: File | null
}

export interface GrapeVarietyUpdatePayload {
  name?: string
  color?: GrapeColor | null
  description?: string | null
  imageFile?: File | null
}
