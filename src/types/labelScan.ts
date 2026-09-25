import type { WineStyle } from '@/types/wines'

/** Fields a vision-LLM call guessed from a label photo. All free text except
 *  `styleGuess` — no DB ids, matching against the appellation/grape reference
 *  tables happens client-side after this comes back. */
export interface ScanResult {
  producer: string | null
  name: string | null
  vintage: number | null
  appellationText: string | null
  grapesText: string[]
  styleGuess: WineStyle | null
  /** Producer/wine page the model found via web search — a guess, not a
   *  verified link. Always shown editable, never auto-trusted. */
  producerLink: string | null
}
