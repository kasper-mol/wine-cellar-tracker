export type FlavorLevel = string

export interface FlavorDescriptorRecord {
  id: string
  name: string
  level: FlavorLevel
  category: string | null
  created_at: string
  updated_at: string
}

export interface FlavorDescriptorCreatePayload {
  name: string
  level: FlavorLevel
  category?: string | null
}

export interface FlavorDescriptorUpdatePayload extends Partial<FlavorDescriptorCreatePayload> {}
