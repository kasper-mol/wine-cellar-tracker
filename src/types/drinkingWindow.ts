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
  /** Years after vintage before the wine physically exists. Suppresses a
   * "drink now" state before release; NOT added to t_start. */
  release_offset_years: number
  confidence: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CuveeRecord {
  id: string
  producer_id: string
  cuvee: string
  tier: number | null
  archetype_key: string | null
  release_offset_years: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AbsoluteOverrideRecord {
  id: string
  producer: string
  cuvee: string | null
  archetype_key: string
  t_start: number
  t_peak: number
  t_end: number
  reason: string | null
  created_at: string
  updated_at: string
}

export type FlagSeverity = 'low' | 'medium' | 'high'

export interface ConditionFlagRecord {
  id: string
  producer: string
  vintage_from: number | null
  vintage_to: number | null
  severity: FlagSeverity
  flag: string
  message: string
  created_at: string
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
  /** Fraction of the window to compress, e.g. 0.15 = 15%. Null => use settings default. */
  compression: number | null
  /** Hard ceiling in years-after-vintage; only meaningful with block_tier_override. */
  hard_cap_years: number | null
  /** When true, tier extension may not push t_end past the hard cap by more than ~2yr. */
  block_tier_override: boolean
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
  /** wine color/type used to pick a sensible fallback when no archetype resolves */
  wineType?: 'red' | 'white' | 'rosé' | 'sparkling' | 'dessert' | null
  vintageScore?: number | null
  docWindow?: { start: number; end: number } | null
  criticWindow?: { start: number; end: number } | null
  nonVintage?: boolean
  riskStance?: RiskStance
  currentYear?: number
  /** resolved archetype key from the explicit mapping (null => no window) */
  archetypeKey?: string | null
  /** specific cuvée name — resolves cuvée tier / absolute overrides */
  cuvee?: string | null
  /** structured intake fields that refine archetype selection */
  predikatLevel?: string | null
  sweetness?: string | null
  juraStyle?: string | null
  friuliStyle?: string | null
  champagneType?: string | null
  disgorgementDate?: string | null
}

/** A condition flag attached to a computed window (warning, not a window). */
export interface WindowFlag {
  severity: FlagSeverity
  flag: string
  message: string
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
  /** Provenance/condition warnings surfaced alongside the window. */
  conditionFlags: WindowFlag[]
  /** Years-after-vintage the wine is released; >0 means release-delayed. */
  releaseOffsetYears: number
}

/** Per-(year, archetype) hot-vintage resolution. */
export interface HotVintageDetail {
  compression: number | null
  hardCapYears: number | null
  blockTierOverride: boolean
}

/** Config bundle injected into the pure engine. */
export interface EngineConfig {
  archetypes: Record<string, ArchetypeRecord>
  settings: SettingsRecord
  /** archetype-scoped hot-vintage resolver ('all' scope matches any archetype) */
  hotVintage: (year: number, archetypeKey: string) => HotVintageDetail | null
  /** normalized producer name -> tier */
  producerTier: (producer?: string) => number | null
  /** (producer, cuvée) -> cuvée row (tier / archetype hint / release offset) */
  cuvee: (producer?: string, cuvee?: string | null) => CuveeRecord | null
  /** (producer, cuvée) -> absolute override, exact cuvée match only */
  absoluteOverride: (producer?: string, cuvee?: string | null) => AbsoluteOverrideRecord | null
  /** condition flags matching producer (+ optional region string) and vintage */
  conditionFlags: (
    producer?: string,
    vintage?: number | null,
    region?: string,
  ) => ConditionFlagRecord[]
}
