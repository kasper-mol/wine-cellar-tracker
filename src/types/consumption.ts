/** A logged "drink a bottle" event, as stored in the DB. */
export interface ConsumptionEvent {
  id: string
  wine_id: string
  user_id: string
  consumed_at: string
  quantity: number
  tasting_notes: string | null
  personal_rating: number | null
  created_at: string
}

/** Payload the UI passes to the store/service when logging a drink. */
export interface DrinkBottlePayload {
  wineId: string
  quantity: number
  /** ISO date (yyyy-mm-dd) or datetime string */
  consumedAt: string
  tastingNotes: string | null
  personalRating: number | null
}
