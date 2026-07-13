/* drinkingWindow.ts — pure drinking-window engine (no I/O).
 * Ported from the reference drinkingWindow.js, with config (archetype baselines,
 * coefficients, producer tiers, hot vintages) injected rather than module-level.
 *
 * Honesty hierarchy: criticWindow (High) -> docWindow (Medium) -> formula (Medium/Low).
 * Archetype resolution is done upstream via the explicit DB mapping (input.archetypeKey);
 * this engine only refines that base key for Grand Cru / German predikat style hints,
 * which depend on the bottle's style string, not its region.
 */
import type {
  DrinkingWindow,
  EngineConfig,
  PhaseNow,
  WineInput,
} from '@/types/drinkingWindow'

const DEFAULT_ARCHETYPE = { t_start: 4, t_peak: 9, t_end: 18 }
const RISK_SCALE: Record<string, number> = { conservative: 0.9, balanced: 1.0, push: 1.1 }

/* ---- producer name normalization (matches the reference norm()) ---- */
export function norm(s: string | null | undefined): string {
  return `${s ?? ''}`
    .toLowerCase()
    .replace(/^(château|chateau|domaine|weingut|tenuta|bodega|dom\.?|ch\.?)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
}

/* ---- vintage rating string -> numeric 100-pt score (or NV/unknown) ---- */
export function parseVintageScore(rating: string | null | undefined): {
  score: number | null
  nonVintage: boolean
} {
  if (rating == null) return { score: null, nonVintage: false }
  const r = `${rating}`.trim()
  if (/^nv$/i.test(r)) return { score: null, nonVintage: true }
  // range like "89-91" -> midpoint
  const range = r.match(/^(\d{2,3})\s*[-–]\s*(\d{2,3})$/)
  if (range) return { score: (Number(range[1]) + Number(range[2])) / 2, nonVintage: false }
  const n = Number(r)
  if (Number.isFinite(n) && n >= 50 && n <= 100) return { score: n, nonVintage: false }
  return { score: null, nonVintage: false } // "NT" / non-numeric -> unknown
}

/* ---- keyword archetype resolver — used ONLY by the config "Seed from keywords"
 *      helper to pre-fill the mapping table, never at runtime. ---- */
const REGION_RULES: [RegExp, string][] = [
  [/pomerol|émilion|emilion|right ?bank/i, 'rightBankBordeaux'],
  [
    /pauillac|julien|estèphe|esteph|margaux|médoc|medoc|pessac|léognan|leognan|graves|left ?bank/i,
    'leftBankBordeaux',
  ],
  [/chablis/i, 'chablis'],
  [/meursault|puligny|chassagne|montrachet|corton-?charl|aloxe|white ?burg/i, 'whiteBurgundy'],
  [
    /gevrey|chambolle|vosne|morey|vougeot|nuits|côte de nuits|cote de nuits|red ?burg|romanée|romanee/i,
    'redBurgundy',
  ],
  [/barbaresco/i, 'barbaresco'],
  [/barolo/i, 'barolo'],
  [/brunello|montalcino/i, 'brunello'],
  [/chianti/i, 'chiantiClassico'],
  [/bolgheri|sassicaia|ornellaia|masseto|tignanello|solaia|super ?tuscan|toscana/i, 'superTuscan'],
  [
    /hermitage|côte-?rôtie|cote-?rotie|cornas|saint-?joseph|st-?joseph|crozes|northern ?rhône|northern ?rhone/i,
    'nRhoneSyrah',
  ],
  [
    /châteauneuf|chateauneuf|gigondas|vacqueyras|southern ?rhône|southern ?rhone/i,
    'sRhoneGrenache',
  ],
  [/ribera/i, 'riberaDelDuero'],
  [/priorat/i, 'priorat'],
  [/rioja/i, 'riojaReserva'],
  [/champagne/i, 'vintageChampagne'],
  [/sauternes|barsac|yquem/i, 'sauternes'],
  [/port|porto|douro/i, 'vintagePort'],
  [/mosel|rheingau|nahe|pfalz|rheinhessen|saar|ruwer/i, 'germanRiesling'],
]
const GRAPE_RULES: [RegExp, string][] = [
  [/cabernet|bordeaux blend/i, 'leftBankBordeaux'],
  [/merlot/i, 'rightBankBordeaux'],
  [/pinot ?noir/i, 'redBurgundy'],
  [/nebbiolo/i, 'barolo'],
  [/sangiovese/i, 'chiantiClassico'],
  [/syrah|shiraz/i, 'nRhoneSyrah'],
  [/grenache|garnacha/i, 'sRhoneGrenache'],
  [/tempranillo|tinto fino/i, 'riojaReserva'],
  [/riesling/i, 'germanRiesling'],
  [/chardonnay/i, 'whiteBurgundy'],
]

export function resolveArchetypeByKeyword(opts: {
  region?: string
  grape?: string
  style?: string
}): string | null {
  const hay = `${opts.region ?? ''} ${opts.style ?? ''}`
  for (const [re, key] of REGION_RULES) {
    if (re.test(hay)) return refineArchetype(key, hay)
  }
  const g = `${opts.grape ?? ''}`
  for (const [re, key] of GRAPE_RULES) if (re.test(g)) return key
  return null
}

/* ---- style refinement: Grand Cru / German predikat shift the base archetype ---- */
function refineArchetype(baseKey: string, hay: string): string {
  if (
    baseKey === 'redBurgundy' &&
    /grand ?cru|romanée|romanee|chambertin|musigny|richebourg|bonnes-?mares|échézeaux|echezeaux|tâche|tache/i.test(
      hay,
    )
  ) {
    return 'redBurgundyGC'
  }
  if (baseKey === 'germanRiesling') {
    if (/tba|trockenbeeren|beerenauslese|eiswein/i.test(hay)) return 'sweetGerman'
    if (/auslese/i.test(hay)) return 'germanAuslese'
    if (/\bgg\b|grosses gewächs|grosses gewachs|trocken|großes|grosses lage/i.test(hay))
      return 'germanGG'
  }
  return baseKey
}

/* ---- main entry point ---- */
export function estimateDrinkingWindow(input: WineInput, config: EngineConfig): DrinkingWindow {
  const {
    vintage,
    region = '',
    style = '',
    producer = '',
    vintageScore,
    docWindow = null,
    criticWindow = null,
    nonVintage = false,
    riskStance,
    currentYear = new Date().getFullYear(),
    archetypeKey = null,
  } = input

  const { settings } = config
  const stance = riskStance ?? settings.risk_default
  const riskFactor = RISK_SCALE[stance] ?? 1.0
  const notes: string[] = []

  // Tier 1 — wine-specific critic window, verbatim.
  if (criticWindow && criticWindow.start && criticWindow.end) {
    return finalize({
      enter: criticWindow.start,
      drinkBy: criticWindow.end,
      peakCentre: criticWindow.start + 0.45 * (criticWindow.end - criticWindow.start),
      archetype: archetypeKey ?? 'unknown',
      confidence: 'High',
      baseUncertainty: 1,
      notes: ['Using wine-specific critic window verbatim.'],
      currentYear,
      riskFactor,
      producerKnown: true,
      redBurg: false,
    })
  }

  // Non-vintage sparkling: vintage charts don't apply.
  if (nonVintage) {
    notes.push('Non-vintage: drink within a few years of release; no vintage logic applied.')
    return finalize({
      enter: currentYear,
      drinkBy: currentYear + 4,
      peakCentre: currentYear + 1.5,
      archetype: 'vintageChampagne',
      confidence: 'Low',
      baseUncertainty: 2,
      notes,
      currentYear,
      riskFactor,
      producerKnown: config.producerTier(producer) != null,
      redBurg: false,
    })
  }

  // Refine the mapped archetype for GC / predikat style hints.
  const hay = `${region} ${style}`
  const archetype = archetypeKey ? refineArchetype(archetypeKey, hay) : null
  const redBurg = archetype === 'redBurgundy' || archetype === 'redBurgundyGC'
  const tier = config.producerTier(producer)
  const producerKnown = tier != null
  if (!producerKnown && producer)
    notes.push(
      `Producer "${producer}" not in tier table — treated as neutral. Add it for a better estimate.`,
    )

  let enter: number
  let peakCentre: number
  let drinkBy: number
  let confidence: 'High' | 'Medium' | 'Low'
  let baseUncertainty: number

  if (docWindow && docWindow.start && docWindow.end) {
    // Tier 2 — anchor to the region+vintage window from the Vintages doc.
    enter = docWindow.start
    drinkBy = docWindow.end
    peakCentre = docWindow.start + 0.45 * (docWindow.end - docWindow.start)
    confidence = 'Medium'
    baseUncertainty = 3
    notes.push('Anchored to region-level vintage window, not bottle-specific.')
  } else {
    // Tier 3 — generate from archetype baseline x vintage modifier.
    const a = archetype ? config.archetypes[archetype] : undefined
    const base = a
      ? { t_start: a.t_start, t_peak: a.t_peak, t_end: a.t_end }
      : DEFAULT_ARCHETYPE
    if (!archetype) notes.push('No archetype mapped — used a cautious medium-aging-red default.')
    if (typeof vintage !== 'number') notes.push('No vintage year supplied — results are unreliable.')

    const Q =
      typeof vintageScore === 'number'
        ? (vintageScore - settings.score_midpoint) / settings.score_divisor
        : 0
    if (vintageScore == null) notes.push('No vintage rating — assumed an average year.')

    const v = vintage ?? currentYear
    enter = v + base.t_start * (1 + settings.k_start * Q)
    peakCentre = v + base.t_peak * (1 + settings.k_peak * Q)
    drinkBy = v + base.t_end * (1 + settings.k_end * Q)

    confidence = producerKnown && tier! >= 4.5 && !redBurg ? 'Medium' : 'Low'
    baseUncertainty = redBurg ? 5 : 4
  }

  // --- override rules ---
  // White Burgundy / Chablis premox: cap the drink-by.
  if ((archetype === 'whiteBurgundy' || archetype === 'chablis') && typeof vintage === 'number') {
    const age = currentYear - vintage
    if (vintage <= settings.premox_vintage_cutoff || age >= settings.premox_age_years) {
      const cap = Math.min(drinkBy, vintage + settings.premox_cap_years)
      if (cap < drinkBy) {
        drinkBy = cap
        notes.push('White Burgundy premox risk — capped the drink-by for near-term drinking.')
      }
    }
  }
  // Hot vintages mature fast.
  if (typeof vintage === 'number' && archetype && isHotVintage(config, vintage, archetype)) {
    drinkBy = vintage + (drinkBy - vintage) * settings.hot_drinkby_factor
    peakCentre = vintage + (peakCentre - vintage) * settings.hot_peak_factor
    notes.push('Hot vintage — pulled the window in; drink on the earlier side.')
  }
  // Producer tier nudge (formula path only, not when anchored to a real window).
  if (!docWindow && producerKnown && typeof vintage === 'number') {
    const ext =
      tier! >= 5
        ? settings.producer_ext_t5
        : tier! >= 4.5
          ? settings.producer_ext_t45
          : tier! >= 4
            ? settings.producer_ext_t4
            : 0
    if (ext) {
      drinkBy = vintage + (drinkBy - vintage) * (1 + ext)
      peakCentre = vintage + (peakCentre - vintage) * (1 + ext * 0.6)
      if (tier! >= 4.5 && !redBurg && confidence === 'Low') confidence = 'Medium'
    }
  }

  return finalize({
    enter,
    peakCentre,
    drinkBy,
    archetype: archetype ?? 'unknown',
    confidence,
    baseUncertainty,
    notes,
    currentYear,
    riskFactor,
    producerKnown,
    redBurg,
  })
}

function isHotVintage(config: EngineConfig, vintage: number, archetype: string): boolean {
  const entry = config.hotVintages.get(vintage)
  if (!entry) return false
  return entry === 'all' || entry.has(archetype)
}

/* ---- phase math, risk stance, rounding, confidence band ---- */
function finalize(args: {
  enter: number
  peakCentre: number
  drinkBy: number
  archetype: string
  confidence: 'High' | 'Medium' | 'Low'
  baseUncertainty: number
  notes: string[]
  currentYear: number
  riskFactor: number
  producerKnown: boolean
  redBurg: boolean
}): DrinkingWindow {
  let { enter, peakCentre, drinkBy } = args
  const { archetype, confidence, baseUncertainty, notes, currentYear, riskFactor } = args

  const v0 = enter
  let peakEnd = peakCentre + 0.5 * (drinkBy - peakCentre)
  let peakStart = enter + 0.5 * (peakCentre - enter)
  peakEnd = v0 + (peakEnd - v0) * riskFactor
  drinkBy = v0 + (drinkBy - v0) * riskFactor

  const r = (x: number) => Math.round(x)
  enter = r(enter)
  peakStart = r(peakStart)
  peakEnd = r(peakEnd)
  drinkBy = r(drinkBy)
  if (peakStart < enter) peakStart = enter
  if (peakEnd < peakStart) peakEnd = peakStart
  if (drinkBy < peakEnd) drinkBy = peakEnd

  let uncertaintyYears = Math.max(2, Math.round(0.15 * (drinkBy - enter)) + baseUncertainty - 2)
  if (!args.producerKnown) uncertaintyYears += 1
  if (args.redBurg) uncertaintyYears += 1

  let phaseNow: PhaseNow
  if (currentYear < enter) phaseNow = 'Hold'
  else if (currentYear < peakStart) phaseNow = 'Approachable'
  else if (currentYear <= peakEnd) phaseNow = 'At peak'
  else if (currentYear <= drinkBy) phaseNow = 'Mature — drink up'
  else phaseNow = 'Past prime'

  return {
    enter,
    peakStart,
    peakEnd,
    drinkBy,
    peakCentre: Math.round(peakCentre),
    phaseNow,
    confidence,
    uncertaintyYears,
    archetype,
    notes,
  }
}
