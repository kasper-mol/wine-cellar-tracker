export type WineStyle = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'

export interface UserWine {
  id: string
  name: string
  producer: string
  varietal: string
  region: string
  country: string
  vintage: number
  style: WineStyle
  quantity: number
  rating: number
  readyToDrink: string
  purchasePrice: number
}

export type WineRecord = UserWine & {
  created_at?: string
  updated_at?: string
  user_id?: string | null
}

export interface WineCreatePayload extends Omit<UserWine, 'id'> {
  user_id?: string
}

export type WineUpdatePayload = Partial<Omit<UserWine, 'id'>>
