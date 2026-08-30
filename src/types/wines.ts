export type WineStyle = 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert'

/* --- Structured intake fields that determine archetype selection ---
 * Free-text at the DB layer (nullable); these unions document the expected
 * values the engine understands. Anything else is treated as unset. */
export type PredikatLevel =
  | 'Kabinett'
  | 'Spätlese'
  | 'Auslese'
  | 'BA'
  | 'TBA'
  | 'Eiswein'
export type Sweetness = 'Sec' | 'Demi-Sec' | 'Moelleux' | 'Doux'
export type JuraStyle = 'ouille' | 'sousvoile'
export type FriuliStyle = 'skinContact' | 'conventional'
export type ChampagneType = 'nv' | 'vintage'

/** Minimal embedded reference to a region/appellation (id + display name) */
export interface AppellationRef {
  id: string
  name: string
}

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
  /** Tier-1 wine-specific critic drink window (overrides the engine when set) */
  critic_window_start: number | null
  critic_window_end: number | null
  /** FK ids */
  region: string | null
  appellation: string | null
  /** Structured intake fields (drive archetype selection; see engine) */
  cuvee: string | null
  predikat_level: string | null
  sweetness: string | null
  jura_style: string | null
  friuli_style: string | null
  champagne_type: string | null
  disgorgement_date: string | null
  /** Embedded related rows (joined in fetchUserWines) */
  region_info?: AppellationRef | null
  appellation_info?: AppellationRef | null
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
  criticWindowStart: number | null
  criticWindowEnd: number | null
  purchasePrice: number
  vivinoLink: string
  regionId: string | null
  regionName: string
  appellationId: string | null
  appellationName: string
  cuvee: string | null
  predikatLevel: string | null
  sweetness: string | null
  juraStyle: string | null
  friuliStyle: string | null
  champagneType: string | null
  disgorgementDate: string | null
}

export interface WineCreatePayload {
  name: string
  producer?: string | null
  varietal?: string | null
  vintage?: number | null
  style?: WineStyle | null
  quantity?: number
  rating?: number | null
  ready_to_drink?: string | null
  purchase_price?: number | null
  purchase_date?: string | null
  vivino_link?: string | null
  critic_window_start?: number | null
  critic_window_end?: number | null
  region?: string | null
  appellation?: string | null
  cuvee?: string | null
  predikat_level?: string | null
  sweetness?: string | null
  jura_style?: string | null
  friuli_style?: string | null
  champagne_type?: string | null
  disgorgement_date?: string | null
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
    criticWindowStart: r.critic_window_start ?? null,
    criticWindowEnd: r.critic_window_end ?? null,
    purchasePrice: r.purchase_price ?? 0,
    vivinoLink: r.vivino_link ?? '',
    regionId: r.region_info?.id ?? null,
    regionName: r.region_info?.name ?? '',
    appellationId: r.appellation_info?.id ?? null,
    appellationName: r.appellation_info?.name ?? '',
    cuvee: r.cuvee ?? null,
    predikatLevel: r.predikat_level ?? null,
    sweetness: r.sweetness ?? null,
    juraStyle: r.jura_style ?? null,
    friuliStyle: r.friuli_style ?? null,
    champagneType: r.champagne_type ?? null,
    disgorgementDate: r.disgorgement_date ?? null,
  }
}
