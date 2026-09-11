/** WSET Level 3 Wine-Lexicon: level → cluster → descriptor. */
export type FlavorLevel = 'primary' | 'secondary' | 'tertiary'

export const FLAVOR_LEVELS: FlavorLevel[] = ['primary', 'secondary', 'tertiary']

/** Tertiary clusters (fruit development, bottle age) are split by wine colour. */
export type FlavorClusterColour = 'white' | 'red'

export interface FlavorClusterRecord {
  id: string
  level: FlavorLevel
  name: string
  colour: FlavorClusterColour | null
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FlavorClusterCreatePayload {
  level: FlavorLevel
  name: string
  colour?: FlavorClusterColour | null
  description?: string | null
  sort_order?: number
}

export type FlavorClusterUpdatePayload = Partial<FlavorClusterCreatePayload>

export interface FlavorDescriptorRecord {
  id: string
  cluster_id: string
  name: string
  /** WSET parenthetical prompt, e.g. "juice or zest?" on lime. */
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface FlavorDescriptorCreatePayload {
  cluster_id: string
  name: string
  note?: string | null
  sort_order?: number
}

export type FlavorDescriptorUpdatePayload = Partial<FlavorDescriptorCreatePayload>

/** Cluster with its descriptors attached, as the flavour page renders it. */
export interface FlavorClusterWithDescriptors extends FlavorClusterRecord {
  descriptors: FlavorDescriptorRecord[]
}
