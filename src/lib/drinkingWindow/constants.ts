/* constants.ts — tunable baselines that are NOT stored in the DB.
 *
 * Everything the user can tune lives in `dw_settings` (see EngineConfig.settings).
 * The values here are structural fallbacks and risk-stance scaling that only
 * change with a code deploy.
 */

/** Fallback drinking-window shapes (years after vintage) used when a wine has
 *  no mapped archetype. Keyed by the wine's colour/type so an unmapped white
 *  is not forced onto the medium-aging-red curve.
 *
 *  t_start = first drinkable, t_peak = centre of the peak plateau,
 *  t_end   = drink-by. These are deliberately cautious — a real archetype
 *  from `dw_archetypes` should almost always win over these. */
export const DEFAULT_ARCHETYPES: Record<
  'red' | 'white' | 'rosé' | 'sparkling' | 'dessert',
  { t_start: number; t_peak: number; t_end: number }
> = {
  red: { t_start: 4, t_peak: 9, t_end: 18 },
  white: { t_start: 1, t_peak: 4, t_end: 8 },
  rosé: { t_start: 0, t_peak: 1, t_end: 3 },
  sparkling: { t_start: 0, t_peak: 3, t_end: 8 },
  dessert: { t_start: 3, t_peak: 10, t_end: 30 },
}

/** Last-ditch default when even the wine type is unknown. */
export const DEFAULT_ARCHETYPE = DEFAULT_ARCHETYPES.red

/** Risk stance -> multiplier applied to the window tail (peakEnd + drinkBy)
 *  in finalize(). conservative pulls the tail in, push extends it. */
export const RISK_SCALE: Record<string, number> = {
  conservative: 0.9,
  balanced: 1.0,
  push: 1.1,
}
