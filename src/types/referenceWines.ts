export type WineStyle = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'

export interface ReferenceWine {
  id: string
  name: string
  producer: string | null
  varietal: string | null
  vintage: number | null
  style: WineStyle | null
  description: string | null
  why_notable: string | null
  country_id: string | null
  region_id: string | null
  appellation_id: string | null
  image_url: string | null
  vivino_link: string | null
  created_at: string
  updated_at: string
}

export interface ReferenceWineCreatePayload {
  name: string
  producer?: string
  varietal?: string
  vintage?: number
  style?: WineStyle
  description?: string
  why_notable?: string
  country_id?: string | null
  region_id?: string | null
  appellation_id?: string | null
  image_url?: string
  vivino_link?: string
}

export type ReferenceWineUpdatePayload = Partial<ReferenceWineCreatePayload>
