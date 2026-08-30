/* normalize.ts — producer-name normalization.
 *
 * Must stay in lock-step with the SQL `dw_norm()` function so that a producer
 * typed in the UI matches the same row the DB matched at import time. Strips a
 * leading estate prefix (Château / Domaine / Weingut / …) and all non-alphanumerics,
 * then lower-cases. E.g. "Château La Tour de Bessan" -> "latourdebessan".
 */
export function norm(s: string | null | undefined): string {
  return `${s ?? ''}`
    .toLowerCase()
    .replace(/^(château|chateau|domaine|weingut|tenuta|bodega|dom\.?|ch\.?)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
}
