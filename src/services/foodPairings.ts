import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type {
  AppellationFoodPairingCreatePayload,
  AppellationFoodPairingRecord,
  DishPresetCreatePayload,
  DishPresetRecord,
  DishPresetRow,
  DishPresetUpdatePayload,
  FoodSearchQueryPayload,
  FoodSearchQueryRecord,
  FoodTagCreatePayload,
  FoodTagRecord,
  FoodTagUpdatePayload,
  WineStyleFoodPairingRecord,
  WineStyleFoodPairingUpsertPayload,
} from '@/types/foodPairings'

/** `sort_order, id` pins the vocabulary order the matcher's tie-breaks depend on. */
export async function fetchFoodTags() {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('food_tags')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
  throwIfError(error)
  return (data ?? []) as FoodTagRecord[]
}

export async function fetchWineStyleFoodPairings() {
  const db = getSupabaseClient()
  const { data, error } = await db.from('wine_style_food_pairings').select('*')
  throwIfError(error)
  return (data ?? []) as WineStyleFoodPairingRecord[]
}

export async function fetchDishPresets() {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dish_presets')
    .select('*, dish_preset_tags(food_tag_id)')
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true })
  throwIfError(error)
  return ((data ?? []) as DishPresetRow[]).map(
    ({ dish_preset_tags, ...preset }): DishPresetRecord => ({
      ...preset,
      foodTagIds: (dish_preset_tags ?? []).map((row) => row.food_tag_id),
    }),
  )
}

/** Targeted: only overrides that touch the matched tags, never the whole table. */
export async function fetchAppellationFoodPairingsForTags(tagIds: string[]) {
  if (!tagIds.length) return []
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_food_pairings')
    .select('*')
    .in('food_tag_id', tagIds)
  throwIfError(error)
  return (data ?? []) as AppellationFoodPairingRecord[]
}

export async function fetchAppellationFoodPairings(appellationId: string) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_food_pairings')
    .select('*')
    .eq('appellation_id', appellationId)
  throwIfError(error)
  return (data ?? []) as AppellationFoodPairingRecord[]
}

export async function createAppellationFoodPairing(payload: AppellationFoodPairingCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('appellation_food_pairings')
    .insert(payload)
    .select()
    .single()
  throwIfError(error)
  return data as AppellationFoodPairingRecord
}

export async function deleteAppellationFoodPairing(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('appellation_food_pairings').delete().eq('id', id)
  throwIfError(error)
}

/** Analytics for vocabulary growth — fire-and-forget; a failure here must never reach the UI. */
export function logFoodSearchQuery(payload: FoodSearchQueryPayload): void {
  try {
    const db = getSupabaseClient()
    void db
      .from('food_search_queries')
      .insert({ ...payload, raw_query: payload.raw_query.slice(0, 200) })
      .then(
        () => undefined,
        () => undefined,
      )
  } catch {
    /* swallow — analytics only */
  }
}

/* ------------------------------ admin: tags ------------------------------ */

export async function createFoodTag(payload: FoodTagCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('food_tags').insert(payload).select().single()
  throwIfError(error)
  return data as FoodTagRecord
}

export async function updateFoodTag(id: string, payload: FoodTagUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('food_tags').update(payload).eq('id', id).select().single()
  throwIfError(error)
  return data as FoodTagRecord
}

/** Cascades to the tag's baseline rows, appellation overrides and preset links. */
export async function deleteFoodTag(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('food_tags').delete().eq('id', id)
  throwIfError(error)
}

/* ------------------------- admin: style baseline ------------------------- */

export async function upsertWineStyleFoodPairing(payload: WineStyleFoodPairingUpsertPayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('wine_style_food_pairings')
    .upsert(payload, { onConflict: 'wine_style,food_tag_id' })
    .select()
    .single()
  throwIfError(error)
  return data as WineStyleFoodPairingRecord
}

export async function deleteWineStyleFoodPairing(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('wine_style_food_pairings').delete().eq('id', id)
  throwIfError(error)
}

/* ------------------------- admin: dish presets ------------------------- */

export async function createDishPreset(payload: DishPresetCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db.from('dish_presets').insert(payload).select().single()
  throwIfError(error)
  return data as Omit<DishPresetRecord, 'foodTagIds'>
}

export async function updateDishPreset(id: string, payload: DishPresetUpdatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('dish_presets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as Omit<DishPresetRecord, 'foodTagIds'>
}

export async function deleteDishPreset(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('dish_presets').delete().eq('id', id)
  throwIfError(error)
}

/** Replace a preset's tag links with exactly `tagIds`. */
export async function replaceDishPresetTags(presetId: string, tagIds: string[]) {
  const db = getSupabaseClient()
  const unique = [...new Set(tagIds)]

  const { error: deleteError } = await db
    .from('dish_preset_tags')
    .delete()
    .eq('dish_preset_id', presetId)
  throwIfError(deleteError)

  if (!unique.length) return
  const { error: insertError } = await db
    .from('dish_preset_tags')
    .insert(unique.map((tagId) => ({ dish_preset_id: presetId, food_tag_id: tagId })))
  throwIfError(insertError)
}

/* --------------------- admin: unmatched-search backlog --------------------- */

export async function fetchFoodSearchQueries(limit = 1000) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('food_search_queries')
    .select('*')
    .eq('matched_count', 0)
    .order('created_at', { ascending: false })
    .limit(limit)
  throwIfError(error)
  return (data ?? []) as FoodSearchQueryRecord[]
}

export async function deleteFoodSearchQueries(ids: string[]) {
  if (!ids.length) return
  const db = getSupabaseClient()
  const { error } = await db.from('food_search_queries').delete().in('id', ids)
  throwIfError(error)
}
