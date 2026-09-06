import type { Confidence, PhaseNow } from '@/types/drinkingWindow'

/** Ripeness reads as one monotonic gold progression — steps from the two
 * Classical ramps, never six unrelated hues. */
export const PHASE_COLOR: Record<PhaseNow, string> = {
  Hold: '#7d7979', // neutral-600
  Approachable: '#e1ad66', // accent-400
  'At peak': '#7d5411', // accent-700
  'Mature — drink up': '#a06f24', // accent-600
  'Past prime': '#9b9797', // neutral-500
}

/** Display labels — the PhaseNow union itself is unchanged. */
export const PHASE_LABEL: Record<PhaseNow, string> = {
  Hold: 'Hold',
  Approachable: 'Approachable',
  'At peak': 'At peak',
  'Mature — drink up': 'Drink up',
  'Past prime': 'Past prime',
}

export const PHASE_TITLE: Record<PhaseNow, string> = {
  Hold: 'Too young — let it rest.',
  Approachable: 'Drinkable but not yet at its best.',
  'At peak': 'Prime drinking window.',
  'Mature — drink up': 'Past peak — drink soon before it fades.',
  'Past prime': 'Likely over the hill.',
}

export const CONFIDENCE_TITLE: Record<Confidence, string> = {
  High: 'High — based on a published critic window for this specific wine.',
  Medium: 'Medium — based on a regional vintage rating or formula with score data.',
  Low: 'Low — formula only, no vintage score available, or this appellation has high natural variability (Grand Cru, predikat wines). Treat the dates as a rough guide only.',
}

/** The phases that mean "drink this now". */
export const READY_PHASES: PhaseNow[] = ['At peak', 'Mature — drink up']

export const PHASE_ORDER: PhaseNow[] = [
  'Hold',
  'Approachable',
  'At peak',
  'Mature — drink up',
  'Past prime',
]
