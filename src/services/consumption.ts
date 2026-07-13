import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type { DrinkBottlePayload } from '@/types/consumption'

/**
 * Logs a "drink a bottle" event and decrements the wine's stock atomically.
 *
 * Wraps the `drink_bottle` Postgres function (insert consumption_event + decrement
 * wines.quantity in a single, row-locked transaction). Returns the wine's new quantity.
 */
export async function drinkBottle(payload: DrinkBottlePayload): Promise<number> {
  const db = getSupabaseClient()
  const { data, error } = await db.rpc('drink_bottle', {
    p_wine_id: payload.wineId,
    p_quantity: payload.quantity,
    p_consumed_at: payload.consumedAt,
    p_tasting_notes: payload.tastingNotes,
    p_personal_rating: payload.personalRating,
  })
  throwIfError(error)
  return data as number
}
