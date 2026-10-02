import type { AppellationStyleProfileRecord } from '@/types/appellationStyleProfiles'
import type { WineAppellationRecord } from '@/types/wineAppellations'

/** An appellation that makes several styles has a page per style: a white and a red from the same
 *  appellation are different wines. One with a single style has nothing to split. */
export function isMultiStyle(appellation: Pick<WineAppellationRecord, 'wine_styles'>): boolean {
  return (appellation.wine_styles?.length ?? 0) > 1
}

export interface StyleFacts {
  summary: string | null
  drinkingWindow: string | null
  grapes: string[]
  /** True where the value is the whole-appellation text standing in for a per-style one. */
  summaryIsShared: boolean
  drinkingWindowIsShared: boolean
  grapesAreShared: boolean
}

/** What to show for one style: its own text where written, else the whole-appellation text,
 *  flagged as such so the page never passes a red's description off as the white's. */
export function styleFacts(
  appellation: Pick<
    WineAppellationRecord,
    'style_summary' | 'drinking_window' | 'signature_grapes'
  >,
  profile:
    | Pick<AppellationStyleProfileRecord, 'style_summary' | 'drinking_window' | 'signature_grapes'>
    | null
    | undefined,
): StyleFacts {
  const ownSummary = profile?.style_summary?.trim() || null
  const ownWindow = profile?.drinking_window?.trim() || null
  const ownGrapes = profile?.signature_grapes?.length ? profile.signature_grapes : null

  return {
    summary: ownSummary ?? appellation.style_summary,
    drinkingWindow: ownWindow ?? appellation.drinking_window,
    grapes: ownGrapes ?? appellation.signature_grapes ?? [],
    summaryIsShared: !ownSummary && !!appellation.style_summary,
    drinkingWindowIsShared: !ownWindow && !!appellation.drinking_window,
    grapesAreShared: !ownGrapes && !!appellation.signature_grapes?.length,
  }
}
