/* adjustments.ts — the post-formula adjustment pipeline.
 *
 * Once a base window (enter / peakCentre / drinkBy) exists, these steps bend it
 * for real-world effects the archetype baseline can't know about: producer
 * quality, a scorching vintage, a chemistry ceiling, premox risk, late release.
 *
 * Each step mutates a shared `WindowDraft` in place and may push a human-readable
 * note. Order matters — see applyAdjustments() for the fixed pipeline.
 *
 * NONE of these run on the docWindow-anchor path (a critic already gave us an
 * end-to-end window there); estimate.ts guards that.
 */
import type { Confidence, HotVintageDetail, SettingsRecord } from '@/types/drinkingWindow'

/** The mutable window under construction. */
export interface WindowDraft {
  enter: number
  peakCentre: number
  drinkBy: number
  confidence: Confidence
}

/** Everything the adjustment steps need beyond the draft itself. */
export interface AdjustmentContext {
  /** raw vintage year; steps that need a real year guard on typeof number */
  vintage: number | null | undefined
  currentYear: number
  /** cuvée tier ?? producer tier; null when the producer is unknown */
  tier: number | null
  redBurg: boolean
  /** true when an absolute override supplied the window (skips tier extension) */
  hasOverride: boolean
  producerKnown: boolean
  archetype: string | null
  releaseOffsetYears: number
  /** hot-vintage resolution for this (year, archetype), or null */
  hot: HotVintageDetail | null
  settings: SettingsRecord
  notes: string[]
}

/** Map a producer/cuvée tier to a drink-by extension factor.
 *  High tiers age longer; sub-3 tiers die earlier than the baseline.
 *  TODO: promote the 0.02 / -0.03 literals to dw_settings columns. */
function tierExtensionFactor(tier: number, settings: SettingsRecord): number {
  if (tier >= 5) return Number(settings.producer_ext_t5)
  if (tier >= 4.5) return Number(settings.producer_ext_t45)
  if (tier >= 4) return Number(settings.producer_ext_t4)
  if (tier >= 3.5) return 0.02
  if (tier >= 3) return 0
  return -0.03
}

/** Step 1 — producer/cuvée tier multiplier. Skipped for the override path.
 *  A hard-capped hot vintage only allows a small (<=2yr) bump, never the full
 *  multiplier. Lifts a Low confidence to Medium for a high tier. */
export function applyTierExtension(draft: WindowDraft, ctx: AdjustmentContext): void {
  const { tier, hot, settings, redBurg, vintage } = ctx
  if (ctx.hasOverride || !ctx.producerKnown || typeof vintage !== 'number' || tier == null) return

  const ext = tierExtensionFactor(tier, settings)
  if (!ext) return

  if (hot && hot.blockTierOverride) {
    // Hard-capped vintage: at most ~2 years of tier extension, never the full multiplier.
    const bump = Math.min(2, (draft.drinkBy - vintage) * ext)
    draft.drinkBy = draft.drinkBy + bump
    draft.peakCentre = vintage + (draft.peakCentre - vintage) * (1 + ext * 0.3)
  } else {
    draft.drinkBy = vintage + (draft.drinkBy - vintage) * (1 + ext)
    draft.peakCentre = vintage + (draft.peakCentre - vintage) * (1 + ext * 0.6)
  }
  if (tier >= 4.5 && !redBurg && draft.confidence === 'Low') draft.confidence = 'Medium'
}

/** Step 2 — hot-vintage compression. Pulls the window in; a per-vintage
 *  compression value wins over the global hot_drinkby_factor default. */
export function applyHotVintageCompression(draft: WindowDraft, ctx: AdjustmentContext): void {
  const { hot, vintage, settings, notes } = ctx
  if (!hot || typeof vintage !== 'number') return

  const compression =
    hot.compression != null ? Number(hot.compression) : 1 - Number(settings.hot_drinkby_factor)
  draft.drinkBy = vintage + (draft.drinkBy - vintage) * (1 - compression)
  draft.peakCentre = vintage + (draft.peakCentre - vintage) * (1 - compression * 0.667)
  notes.push('Hot vintage — pulled the window in; drink on the earlier side.')
}

/** Step 3 — hard vintage cap. A chemistry ceiling that even a top producer
 *  cannot beat (the +2yr matches the tier bump already permitted in step 1). */
export function applyHardVintageCap(draft: WindowDraft, ctx: AdjustmentContext): void {
  const { hot, vintage, notes } = ctx
  if (!hot || !hot.blockTierOverride || hot.hardCapYears == null || typeof vintage !== 'number')
    return

  const cap = vintage + hot.hardCapYears + 2
  if (draft.drinkBy > cap) {
    draft.drinkBy = cap
    notes.push('Hard vintage cap — do not hold past the cap regardless of producer.')
  }
}

/** Step 4 — White Burgundy / Chablis premox cap. Older or pre-cutoff vintages
 *  carry premature-oxidation risk, so the drink-by is pulled to a safer horizon. */
export function applyPremoxCap(draft: WindowDraft, ctx: AdjustmentContext): void {
  const { archetype, vintage, currentYear, settings, notes } = ctx
  if ((archetype !== 'whiteBurgundy' && archetype !== 'chablis') || typeof vintage !== 'number')
    return

  const age = currentYear - vintage
  if (
    vintage <= Number(settings.premox_vintage_cutoff) ||
    age >= Number(settings.premox_age_years)
  ) {
    const cap = Math.min(draft.drinkBy, vintage + Number(settings.premox_cap_years))
    if (cap < draft.drinkBy) {
      draft.drinkBy = cap
      notes.push('White Burgundy premox risk — capped the drink-by for near-term drinking.')
    }
  }
}

/** Step 5 — release offset. The wine does not physically exist before this, so
 *  push `enter` forward and suppress any "drink now" before release. */
export function applyReleaseOffset(draft: WindowDraft, ctx: AdjustmentContext): void {
  const { releaseOffsetYears, vintage, notes } = ctx
  if (releaseOffsetYears <= 0 || typeof vintage !== 'number') return

  const releaseYear = vintage + releaseOffsetYears
  if (draft.enter < releaseYear) {
    draft.enter = releaseYear
    notes.push(`Released ~${releaseOffsetYears} years after vintage — not drinkable before then.`)
  }
}

/** The fixed adjustment pipeline, in order. Runs only on the formula/override
 *  paths (never on the docWindow anchor). */
export function applyAdjustments(draft: WindowDraft, ctx: AdjustmentContext): void {
  applyTierExtension(draft, ctx) // 1. producer quality
  applyHotVintageCompression(draft, ctx) // 2. hot vintage pulls it in
  applyHardVintageCap(draft, ctx) // 3. chemistry ceiling
  applyPremoxCap(draft, ctx) // 4. white Burg premox
  applyReleaseOffset(draft, ctx) // 5. not drinkable before release
}
