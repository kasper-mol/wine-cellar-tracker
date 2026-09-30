import type { WineStyle } from '@/types/wineAppellations'

/** Matches the DB CHECK on food_tags.category. */
export type FoodTagCategory =
  | 'protein'
  | 'seafood'
  | 'vegetable_produce'
  | 'cheese_dairy'
  | 'preparation'
  | 'flavor_profile'
  | 'cuisine'
  | 'dessert_sweet'

/** -2 clashes badly, -1 mild clash, 1 good match, 2 classic match. No row = no claim. */
export type FoodAffinity = -2 | -1 | 1 | 2

/** One concept in the controlled food vocabulary (a protein, a method, a flavour, a cuisine…). */
export interface FoodTagRecord {
  id: string
  category: FoodTagCategory
  name: string
  slug: string
  /** Lowercase, trimmed alternate phrases; the matcher also matches `name`. */
  synonyms: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

/** Baseline layer: how one wine style sits with one food tag, for every appellation of that style. */
export interface WineStyleFoodPairingRecord {
  id: string
  wine_style: WineStyle
  food_tag_id: string
  affinity: FoodAffinity
  note: string | null
  created_at: string
}

/** Precision layer: an editor's override for one appellation in one style. */
export interface AppellationFoodPairingRecord {
  id: string
  appellation_id: string
  wine_style: WineStyle
  food_tag_id: string
  affinity: FoodAffinity
  note: string | null
  created_at: string
}

export interface AppellationFoodPairingCreatePayload {
  appellation_id: string
  wine_style: WineStyle
  food_tag_id: string
  affinity: FoodAffinity
  note?: string | null
}

/** A named bundle of tags for the quick-pick chips — sugar over the same vocabulary. */
export interface DishPresetRecord {
  id: string
  label: string
  sort_order: number
  created_at: string
  /** Hydrated from the joined dish_preset_tags rows. */
  foodTagIds: string[]
}

/** Row shape of dish_presets with its join rows embedded, before hydration. */
export interface DishPresetRow extends Omit<DishPresetRecord, 'foodTagIds'> {
  dish_preset_tags: { food_tag_id: string }[] | null
}

export interface FoodSearchQueryPayload {
  raw_query: string
  matched_tag_ids: string[]
  matched_count: number
  user_id: string | null
}

export interface FoodTagCreatePayload {
  category: FoodTagCategory
  name: string
  slug: string
  synonyms: string[]
  sort_order: number
}

/** The slug is a stable key (seed functions, deep links) — it is never updated. */
export type FoodTagUpdatePayload = Partial<Omit<FoodTagCreatePayload, 'slug'>>

export interface WineStyleFoodPairingUpsertPayload {
  wine_style: WineStyle
  food_tag_id: string
  affinity: FoodAffinity
  note: string | null
}

export interface DishPresetCreatePayload {
  label: string
  sort_order: number
}

export type DishPresetUpdatePayload = Partial<DishPresetCreatePayload>

/** A logged free-text search (admin-readable). */
export interface FoodSearchQueryRecord {
  id: string
  raw_query: string
  matched_tag_ids: string[]
  matched_count: number
  user_id: string | null
  created_at: string
}
