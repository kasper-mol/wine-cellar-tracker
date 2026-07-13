/* Drinking-window engine — types
 * Config records mirror the dw_* tables; WineInput/DrinkingWindow are the pure
 * engine's contract. See src/lib/drinkingWindow.ts for the engine itself.
 */

export type CurveShape = 'earlyBell' | 'standardBell' | 'lateBell' | 'twinPeak'
export type RiskStance = 'conservative' | 'balanced' | 'push'
export type PhaseNow =
  | 'Hold'
  | 'Approachable'
  | 'At peak'
  | 'Mature — drink up'
  | 'Past prime'
export type Confidence = 'High' | 'Medium' | 'Low'

/* --------------------------- config records --------------------------- */

export interface ArchetypeRecord {
  id: string
  key: string
  name: string
  t_start: number
  t_peak: number
  t_end: number
  curve: CurveShape
  created_at: string
  updated_at: string
}

export interface ArchetypeMappingRecord {
  id: string
  archetype_id: string
  appellation_id: string | null
  region_id: string | null
  created_at: string
  updated_at: string
}

export interface ProducerTierRecord {
  id: string
  name: string
  tier: number
  created_at: string
  updated_at: string
}

export interface HotVintageRecord {
  id: string
  year: number
  /** 'all' or an archetype key */
  scope: string
  created_at: string
}

export interface SettingsRecord {
  id: string
  k_start: number
  k_peak: number
  k_end: number
  risk_default: RiskStance
  score_midpoint: number
  score_divisor: number
  premox_cap_years: number
  premox_vintage_cutoff: number
  premox_age_years: number
  hot_drinkby_factor: number
  hot_peak_factor: number
  producer_ext_t5: number
  producer_ext_t45: number
  producer_ext_t4: number
  updated_at: string
}

/* ----------------------------- payloads ------------------------------ */

export interface ArchetypeCreatePayload {
  key: string
  name: string
  t_start: number
  t_peak: number
  t_end: number
  curve: CurveShape
}

export interface ArchetypeUpdatePayload {
  name?: string
  t_start?: number
  t_peak?: number
  t_end?: number
  curve?: CurveShape
}

export interface ProducerTierCreatePayload {
  name: string
  tier: number
}
export type ProducerTierUpdatePayload = Partial<ProducerTierCreatePayload>

export interface HotVintageCreatePayload {
  year: number
  scope: string
}

export interface SettingsUpdatePayload extends Partial<Omit<SettingsRecord, 'id' | 'updated_at'>> {}

/* --------------------------- engine contract -------------------------- */

export interface WineInput {
  vintage?: number | null
  /** appellation/region display string, used by the keyword seeder only */
  region?: string
  grape?: string
  producer?: string
  /** extra style hints, e.g. 'Grand Cru', 'Auslese', 'GG' */
  style?: string
  vintageScore?: number | null
  docWindow?: { start: number; end: number } | null
  criticWindow?: { start: number; end: number } | null
  nonVintage?: boolean
  riskStance?: RiskStance
  currentYear?: number
  /** resolved archetype key from the explicit mapping (null => no window) */
  archetypeKey?: string | null
}

export interface DrinkingWindow {
  enter: number
  peakStart: number
  peakEnd: number
  drinkBy: number
  peakCentre: number
  phaseNow: PhaseNow
  confidence: Confidence
  uncertaintyYears: number
  archetype: string
  notes: string[]
}

/** Config bundle injected into the pure engine. */
export interface EngineConfig {
  archetypes: Record<string, ArchetypeRecord>
  settings: SettingsRecord
  /** year -> 'all' | Set of archetype keys */
  hotVintages: Map<number, 'all' | Set<string>>
  /** normalized producer name -> tier */
  producerTier: (producer?: string) => number | null
}
