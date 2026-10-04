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

/** Flavour rows worth showing on an appellation page: the selected style's own on a multi-style
 *  page, otherwise only styles the appellation still lists. A style dropped from `wine_styles`
 *  (e.g. red Puligny) can leave flavour rows behind; they must not pass for the wine on show. */
export function flavorRowsForPage<Row extends { wine_style: string }>(
  rows: Row[],
  wineStyles: readonly string[] | null | undefined,
  selectedStyle: string | null,
): Row[] {
  if (wineStyles && wineStyles.length > 1) {
    return selectedStyle ? rows.filter((row) => row.wine_style === selectedStyle) : rows
  }
  return wineStyles?.length ? rows.filter((row) => wineStyles.includes(row.wine_style)) : rows
}
