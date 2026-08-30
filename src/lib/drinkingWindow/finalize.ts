/* finalize.ts — turn the raw enter/peakCentre/drinkBy triple into the final
 * DrinkingWindow: derive the peak plateau, apply risk stance to the tail, round,
 * clamp ordering, size the uncertainty band, and classify the current phase.
 */
import type { Confidence, DrinkingWindow, PhaseNow, WindowFlag } from '@/types/drinkingWindow'
import { RISK_SCALE } from './constants'

export interface FinalizeArgs {
  enter: number
  peakCentre: number
  drinkBy: number
  archetype: string
  confidence: Confidence
  /** base ±years before window-width and provenance widening are added */
  baseUncertainty: number
  notes: string[]
  currentYear: number
  /** RISK_SCALE[stance]; scales the window tail (peakEnd + drinkBy) */
  riskFactor: number
  producerKnown: boolean
  redBurg: boolean
  conditionFlags: WindowFlag[]
  releaseOffsetYears: number
}

export { RISK_SCALE }

export function finalize(args: FinalizeArgs): DrinkingWindow {
  let { enter, peakCentre, drinkBy } = args
  const { archetype, confidence, baseUncertainty, notes, currentYear, riskFactor } = args

  // Peak plateau: halfway from enter to centre, and centre to drink-by.
  const v0 = enter
  let peakEnd = peakCentre + 0.5 * (drinkBy - peakCentre)
  let peakStart = enter + 0.5 * (peakCentre - enter)
  // Risk stance stretches/shrinks only the tail (peakEnd + drinkBy), anchored at enter.
  peakEnd = v0 + (peakEnd - v0) * riskFactor
  drinkBy = v0 + (drinkBy - v0) * riskFactor

  // Round to whole years, then clamp so the milestones never invert.
  const r = (x: number) => Math.round(x)
  enter = r(enter)
  peakStart = r(peakStart)
  peakEnd = r(peakEnd)
  drinkBy = r(drinkBy)
  if (peakStart < enter) peakStart = enter
  if (peakEnd < peakStart) peakEnd = peakStart
  if (drinkBy < peakEnd) drinkBy = peakEnd

  // Uncertainty grows with window width; unknown producer / red Burg add a year each.
  let uncertaintyYears = Math.max(2, Math.round(0.15 * (drinkBy - enter)) + baseUncertainty - 2)
  if (!args.producerKnown) uncertaintyYears += 1
  if (args.redBurg) uncertaintyYears += 1

  // Where "now" sits relative to the window.
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
    conditionFlags: args.conditionFlags,
    releaseOffsetYears: args.releaseOffsetYears,
  }
}
