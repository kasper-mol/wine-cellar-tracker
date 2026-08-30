/* vintageScore.ts — turn a critic's vintage rating string into a number,
 * and turn that number into the engine's quality modifier Q.
 */
import type { SettingsRecord } from '@/types/drinkingWindow'

/** Parse a vintage rating string into a 100-pt score.
 *  - "NV"        -> nonVintage flag set, score null (skip vintage logic)
 *  - "89-91"     -> midpoint 90
 *  - "94"        -> 94 (only accepted in the 50-100 band)
 *  - "NT" / junk -> score null (treated as an unknown/average year) */
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

/** Quality modifier Q: how far this vintage sits from the "typical" year,
 *  expressed in score_divisor-sized steps. Positive Q stretches the window,
 *  negative Q shrinks it (applied via k_start/k_peak/k_end in the formula path).
 *  Returns 0 when no score is known so an unrated wine gets the plain baseline. */
export function computeQ(vintageScore: number | null | undefined, settings: SettingsRecord): number {
  if (typeof vintageScore !== 'number') return 0
  return (vintageScore - Number(settings.score_midpoint)) / Number(settings.score_divisor)
}
