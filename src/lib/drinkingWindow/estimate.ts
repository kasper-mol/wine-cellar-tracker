/* estimate.ts — the orchestrator. Ties the pieces together in a fixed order:
 *
 *   guards        -> condition flags (may abort), critic window, non-vintage
 *   resolve       -> cuvée/override, archetype (+refine), tier, release offset, Q
 *   base window   -> one of: absolute override | docWindow anchor | archetype formula
 *   adjustments   -> tier / hot vintage / hard cap / premox / release  (see adjustments.ts)
 *   finalize      -> peak plateau, risk stance, rounding, phase          (see finalize.ts)
 *
 * Confidence honesty hierarchy:
 *   critic window (High) > absolute override (Medium) > archetype formula
 *   (High/Medium/Low by producer tier) > docWindow anchor (Low, only when no
 *   archetype resolved).
 *
 * Returns null when the wine cannot resolve (a NO_VINTAGES_EXIST flag matches).
 */
import type {
  ConditionFlagRecord,
  DrinkingWindow,
  EngineConfig,
  WindowFlag,
  WineInput,
} from '@/types/drinkingWindow'
import { DEFAULT_ARCHETYPE, DEFAULT_ARCHETYPES, RISK_SCALE } from './constants'
import { computeQ } from './vintageScore'
import { refineArchetype } from './archetype'
import { applyAdjustments, type AdjustmentContext, type WindowDraft } from './adjustments'
import { finalize } from './finalize'

function toWindowFlags(records: ConditionFlagRecord[]): WindowFlag[] {
  return records.map((f) => ({ severity: f.severity, flag: f.flag, message: f.message }))
}

export function estimateDrinkingWindow(
  input: WineInput,
  config: EngineConfig,
): DrinkingWindow | null {
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
    cuvee = null,
    wineType = null,
  } = input

  const { settings } = config
  const stance = riskStance ?? settings.risk_default
  const riskFactor = RISK_SCALE[stance] ?? 1.0
  const notes: string[] = []

  /* ---- guard: condition flags (gathered once, attached to any result) ---- */
  const flagRecords = config.conditionFlags(producer, vintage ?? null, region)
  const conditionFlags = toWindowFlags(flagRecords)
  // A "no vintages exist" flag means the wine cannot resolve at all.
  if (flagRecords.some((f) => f.flag === 'NO_VINTAGES_EXIST')) return null

  /* ---- guard: Tier 1 — wine-specific critic window, used verbatim ---- */
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
      conditionFlags,
      releaseOffsetYears: 0,
    })
  }

  /* ---- guard: non-vintage sparkling — vintage charts don't apply ---- */
  if (nonVintage) {
    notes.push('Non-vintage: drink within a few years of release; no vintage logic applied.')
    return finalize({
      enter: currentYear,
      drinkBy: currentYear + 4,
      peakCentre: currentYear + 1.5,
      archetype: 'champagneNVPrestige',
      confidence: 'Low',
      baseUncertainty: 2,
      notes,
      currentYear,
      riskFactor,
      producerKnown: config.producerTier(producer) != null,
      redBurg: false,
      conditionFlags,
      releaseOffsetYears: 0,
    })
  }

  /* ---- resolve: cuvée row + absolute override ---- */
  const cuveeRow = config.cuvee(producer, cuvee)
  const override = config.absoluteOverride(producer, cuvee)

  /* ---- resolve: archetype key (cuvée hint > mapping; override forces its own) ---- */
  let baseKey = archetypeKey
  if (cuveeRow?.archetype_key) baseKey = cuveeRow.archetype_key
  if (override) baseKey = override.archetype_key
  const hay = `${region} ${style}`
  const archetype = baseKey ? refineArchetype(baseKey, hay, input) : null
  const redBurg = archetype === 'redBurgundy' || archetype === 'redBurgundyGC'

  /* ---- resolve: tier (cuvée tier first, then producer tier) ---- */
  const cuveeTier = cuveeRow?.tier != null ? Number(cuveeRow.tier) : null
  const producerTier = config.producerTier(producer)
  const tier = cuveeTier ?? producerTier
  const producerKnown = tier != null
  if (!producerKnown && producer)
    notes.push(
      `Producer "${producer}" not in tier table — treated as neutral. Add it for a better estimate.`,
    )

  /* ---- resolve: release offset (cuvée-specific overrides the archetype default) ---- */
  const archReleaseOffset = archetype
    ? Number(config.archetypes[archetype]?.release_offset_years ?? 0)
    : 0
  const cuveeReleaseOffset = cuveeRow ? Number(cuveeRow.release_offset_years ?? 0) : 0
  const releaseOffsetYears = Math.max(archReleaseOffset, cuveeReleaseOffset)

  /* ---- resolve: quality modifier Q + effective vintage year ---- */
  const Q = computeQ(vintageScore, settings)
  if (vintageScore == null && !override) notes.push('No vintage rating — assumed an average year.')
  const v = vintage ?? currentYear

  /* ---- base window: pick ONE of override / anchor / formula ---- */
  // Anchor only when no archetype resolved — otherwise the formula path (with
  // tier + hot-vintage adjustments) is strictly more informative than a
  // region-wide critic window applied to every producer in that region.
  const anchored = !override && !archetype && !!(docWindow && docWindow.start && docWindow.end)

  const draft: WindowDraft = { enter: 0, peakCentre: 0, drinkBy: 0, confidence: 'Low' }
  let baseUncertainty: number

  if (override) {
    // Producer/cuvée-specific override — replaces archetype t-values, skips tier.
    draft.enter = v + Number(override.t_start) * (1 + settings.k_start * Q)
    draft.peakCentre = v + Number(override.t_peak) * (1 + settings.k_peak * Q)
    draft.drinkBy = v + Number(override.t_end) * (1 + settings.k_end * Q)
    draft.confidence = 'Medium'
    baseUncertainty = 3
    notes.push('Producer/cuvée-specific override applied — tier multiplier not stacked.')
  } else if (anchored) {
    // Last-resort — no archetype mapped; anchor to the region vintage window.
    draft.enter = docWindow!.start
    draft.drinkBy = docWindow!.end
    draft.peakCentre = docWindow!.start + 0.45 * (docWindow!.end - docWindow!.start)
    draft.confidence = 'Low'
    baseUncertainty = 4
    notes.push(
      'No archetype mapped — fell back to region-level vintage window (not bottle-specific).',
    )
  } else {
    // Archetype formula path — archetype baseline × vintage modifier (Q).
    const a = archetype ? config.archetypes[archetype] : undefined
    const base = a
      ? { t_start: Number(a.t_start), t_peak: Number(a.t_peak), t_end: Number(a.t_end) }
      : (wineType && DEFAULT_ARCHETYPES[wineType]) || DEFAULT_ARCHETYPE
    if (!archetype)
      notes.push(
        `No archetype mapped — used ${wineType ?? 'red'}-style default (baseline, not producer-specific).`,
      )
    if (typeof vintage !== 'number')
      notes.push('No vintage year supplied — results are unreliable.')

    draft.enter = v + base.t_start * (1 + settings.k_start * Q)
    draft.peakCentre = v + base.t_peak * (1 + settings.k_peak * Q)
    draft.drinkBy = v + base.t_end * (1 + settings.k_end * Q)

    const highTier = tier != null && tier >= 4.5
    if (producerKnown && archetype && highTier && !redBurg) draft.confidence = 'High'
    else if (producerKnown && archetype) draft.confidence = 'Medium'
    else draft.confidence = 'Low'
    baseUncertainty = redBurg ? 5 : 4
  }

  /* ---- adjustments: everything except the anchor path ---- */
  if (!anchored) {
    const hot =
      typeof vintage === 'number' && archetype ? config.hotVintage(vintage, archetype) : null
    const ctx: AdjustmentContext = {
      vintage,
      currentYear,
      tier,
      redBurg,
      hasOverride: !!override,
      producerKnown,
      archetype,
      releaseOffsetYears,
      hot,
      settings,
      notes,
    }
    applyAdjustments(draft, ctx)
  }

  /* ---- finalize ---- */
  return finalize({
    enter: draft.enter,
    peakCentre: draft.peakCentre,
    drinkBy: draft.drinkBy,
    archetype: archetype ?? 'unknown',
    confidence: draft.confidence,
    baseUncertainty,
    notes,
    currentYear,
    riskFactor,
    producerKnown,
    redBurg,
    conditionFlags,
    releaseOffsetYears,
  })
}
