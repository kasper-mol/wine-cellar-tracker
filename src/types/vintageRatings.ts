export type RatingType = 'numeric' | 'grade' | 'range'

export interface MergedVintageRating {
  year: number
  rating: string
  rating_type: 'numeric' | 'grade' | 'range' | null
  maturity: string | null
  structure_flags: string[] | null
  drink_from: number | null
  drink_until: number | null
  description: string | null
  fallback: boolean
}

export interface VintageRatingsBySource {
  source_id: string
  source_name: string
  ratings: MergedVintageRating[]
}

export interface VintageRatingSourceRecord {
  id: string
  name: string
  url: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface VintageRatingRecord {
  id: string
  source_id: string
  year: number
  rating: string
  rating_type: RatingType | null
  maturity: string | null
  structure_flags: string[] | null
  drink_from: number | null
  drink_until: number | null
  description: string | null
  region_id: string | null
  appellation_id: string | null
  created_at: string
  updated_at: string
}

export interface VintageRatingSourceCreatePayload {
  name: string
  url?: string | null
  description?: string | null
}

export interface VintageRatingSourceUpdatePayload
  extends Partial<VintageRatingSourceCreatePayload> {}

export interface VintageRatingCreatePayload {
  source_id: string
  year: number
  rating: string
  rating_type?: RatingType | null
  maturity?: string | null
  structure_flags?: string[] | null
  drink_from?: number | null
  drink_until?: number | null
  description?: string | null
  region_id?: string | null
  appellation_id?: string | null
}

export interface VintageRatingUpdatePayload extends Partial<VintageRatingCreatePayload> {}

export interface VintageRatingRowInput {
  year: number
  rating: string
  rating_type?: RatingType | null
  maturity?: string | null
  structure_flags?: string[] | null
  drink_from?: number | null
  drink_until?: number | null
  description?: string | null
}

export interface VintageRatingsBatchCreatePayload {
  source_id: string
  region_id?: string | null
  appellation_id?: string | null
  rows: VintageRatingRowInput[]
}
