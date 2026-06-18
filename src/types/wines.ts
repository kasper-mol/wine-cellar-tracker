export type WineStyle = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'

/** Shape of a wine row as returned from the DB */
export interface WineRecord {
  id: string
  user_id: string
  name: string
  producer: string | null
  varietal: string | null
  vintage: number | null
  style: WineStyle | null
  quantity: number
  rating: number | null
  ready_to_drink: string | null
  purchase_price: number | null
  purchase_date: string | null
  vivino_link: string | null
  region: string | null
  appellation: string | null
  created_at: string
  updated_at: string
}

/** Shape used throughout the UI */
export interface UserWine {
  id: string
  name: string
  producer: string
  varietal: string
  vintage: number
  style: WineStyle
  quantity: number
  rating: number
  readyToDrink: string
  purchasePrice: number
}

export interface WineCreatePayload {
  name: string
  producer?: string
  varietal?: string
  vintage?: number
  style?: WineStyle
  quantity?: number
  rating?: number
  ready_to_drink?: string
  purchase_price?: number
  purchase_date?: string
  vivino_link?: string
  region?: string | null
  appellation?: string | null
}

export type WineUpdatePayload = Partial<WineCreatePayload>

/** Map a DB record to the UI shape */
export function wineRecordToUserWine(r: WineRecord): UserWine {
  return {
    id: r.id,
    name: r.name,
    producer: r.producer ?? '',
    varietal: r.varietal ?? '',
    vintage: r.vintage ?? 0,
    style: r.style ?? 'red',
    quantity: r.quantity,
    rating: r.rating ?? 0,
    readyToDrink: r.ready_to_drink ?? '',
    purchasePrice: r.purchase_price ?? 0,
  }
}
