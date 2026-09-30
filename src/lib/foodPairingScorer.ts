/** Matched food tags → appellation and cellar-wine scores. Pure: no Supabase, no Vue. */
import type { EditorialIndex } from '@/lib/foodPairingEditorial'
import type { FoodTagMatch } from '@/lib/foodTagMatcher'
import { toAppellationStyle } from '@/lib/wineStyles'
import type {
  AppellationFoodPairingRecord,
  FoodTagCategory,
  WineStyleFoodPairingRecord,
} from '@/types/foodPairings'
import type { WineAppellationRecord, WineStyle } from '@/types/wineAppellations'
import type { WineRecord } from '@/types/wines'

/** The 0–10 match: how well a style fits the dish tops out at FIT_MAX (a "classic" rating on
 *  every tag), and the appellation itself can add up to EVIDENCE_MAX more — so a 10 means the
 *  style suits the dish AND the appellation is known for it. */
export const FIT_MAX = 8
export const EVIDENCE_MAX = 2

export interface StyleScore {
  /** Raw weighted sum of affinities. Positive means there is something to recommend. */
  score: number
  /** The 0–10 match shown to users; see computeMatch. */
  match: number
  /** Editorial "classic pairing" phrases that confirmed this appellation for the dish. */
  confirmedBy: string[]
  /** Tags with a non-zero combined affinity under this style (clashes included). */
  matchedTagIds: string[]
  /** The subset that actually pulls the score up — what a "why" label should name. */
  positiveTagIds: string[]
}

export interface AppellationPairingResult {
  appellation: WineAppellationRecord
  /** Driving style's raw score — positive means worth showing. */
  score: number
  /** Driving style's 0–10 match — what "Appellations to try" ranks and displays. */
  match: number
  /** The style that produced `score` and `match`. */
  drivingStyle: WineStyle | null
  matchedTagIds: string[]
  positiveTagIds: string[]
  confirmedBy: string[]
  /** One entry per style the appellation produces, INCLUDING styles scoring <= 0.
   *  scoreCellarWines reads the entry for an owned bottle's own style; it never
   *  substitutes `score`/`match`/`drivingStyle` for an individual bottle. */
  styleScores: Partial<Record<WineStyle, StyleScore>>
}

export interface CellarWineMatch {
  wine: WineRecord
  score: number
  /** 0–10: the bottle's own style against the dish, plus its appellation's evidence. */
  match: number
  drivingStyle: WineStyle | null
  positiveTagIds: string[]
  confirmedBy: string[]
}

interface TagSignal {
  affinity: number
  confidence: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Turns a style's per-tag affinities into a raw sum and the 0–10 match.
 *
 *  Fit: the confidence-weighted mean affinity over the tags the style actually rates (-2…+2,
 *  mapped onto 0…FIT_MAX). A part of the dish the style says nothing about costs only a small
 *  penalty, not a proportional one — silence is "not curated", never "bad". Then, if the style
 *  has something positive to say, appellation `evidence` (up to EVIDENCE_MAX) is added. A
 *  clashing style gets none: an appellation's reputation can't rescue the wrong style. */
export function computeMatch(signals: TagSignal[], evidence = 0): { score: number; match: number } {
  let score = 0
  let claimedWeight = 0
  let totalWeight = 0
  let weightedAffinity = 0
  for (const { affinity, confidence } of signals) {
    totalWeight += confidence
    if (affinity === 0) continue
    claimedWeight += confidence
    score += affinity * confidence
    weightedAffinity += clamp(affinity, -2, 2) * confidence
  }
  if (claimedWeight === 0) return { score: 0, match: 0 }

  const mean = weightedAffinity / claimedWeight // -2 … +2
  const coverage = claimedWeight / totalWeight
  const fit = ((mean + 2) / 4) * FIT_MAX * (0.75 + 0.25 * coverage)
  const match = score > 0 ? Math.min(10, fit + clamp(evidence, 0, EVIDENCE_MAX)) : fit
  return { score, match }
}

/** Returns one entry per appellation that has `wine_styles`, in input order, whatever the
 *  score. Never filters, sorts or truncates: display-side cuts belong to the caller, so
 *  scoreCellarWines can always look up any appellation.
 *
 *  `editorial` (optional) is what each appellation's own classic pairings mention. It confirms
 *  a dish ingredient only for a style that already rates it well, and never where an editor
 *  curated an override for that (appellation, style, tag) — the override speaks for itself. */
export function scoreAppellations(
  appellations: WineAppellationRecord[],
  matches: FoodTagMatch[],
  baseline: WineStyleFoodPairingRecord[],
  overrides: AppellationFoodPairingRecord[],
  editorial?: EditorialIndex,
): AppellationPairingResult[] {
  const confidenceByTag = new Map(matches.map((m) => [m.tag.id, m.confidence]))
  const baselineByStyleTag = new Map(
    baseline.map((b) => [`${b.wine_style}:${b.food_tag_id}`, b.affinity]),
  )
  const overrideByAppStyleTag = new Map(
    overrides.map((o) => [`${o.appellation_id}:${o.wine_style}:${o.food_tag_id}`, o.affinity]),
  )

  const results: AppellationPairingResult[] = []
  for (const appellation of appellations) {
    const styles = appellation.wine_styles ?? []
    // No wine_styles yet (e.g. copy still pending): there is no scoreable baseline. Never guess.
    if (styles.length === 0) continue

    const phraseByTag = new Map(
      (editorial?.get(appellation.id) ?? []).map((mention) => [mention.tagId, mention.phrase]),
    )
    const styleScores: Partial<Record<WineStyle, StyleScore>> = {}

    for (const style of styles) {
      const signals: TagSignal[] = []
      const matchedTagIds: string[] = []
      const positiveTagIds: string[] = []
      const confirmedBy = new Set<string>()
      let evidence = 0

      for (const [tagId, confidence] of confidenceByTag) {
        const baseAffinity = baselineByStyleTag.get(`${style}:${tagId}`) ?? 0
        // Overrides are scoped to (appellation, style, tag): a curation for one style
        // can never leak onto a sibling style of the same appellation.
        const override = overrideByAppStyleTag.get(`${appellation.id}:${style}:${tagId}`)
        const combined = baseAffinity + (override ?? 0)
        signals.push({ affinity: combined, confidence })
        if (combined === 0) continue
        matchedTagIds.push(tagId)
        if (combined > 0) positiveTagIds.push(tagId)

        if (override !== undefined) {
          // Curated for this appellation: +2 counts in full, +1 as half. A negative override
          // needs no evidence term — it already pulls the fit down.
          if (override > 0) evidence += confidence * (override / 2)
        } else if (baseAffinity >= 1) {
          const phrase = phraseByTag.get(tagId)
          if (phrase) {
            evidence += confidence
            confirmedBy.add(phrase)
          }
        }
      }

      const { score, match } = computeMatch(signals, evidence)
      // Every produced style keeps its own entry, even when it scores <= 0.
      styleScores[style] = {
        score,
        match,
        confirmedBy: score > 0 ? [...confirmedBy] : [],
        matchedTagIds,
        positiveTagIds,
      }
    }

    // Driving style: the best match among styles with something positive to say (any style
    // if none do). A style can't outrank one with real evidence just by matching less.
    const entries = styles.map((style) => ({ style, entry: styleScores[style]! }))
    const positive = entries.filter((e) => e.entry.score > 0)
    const best = (positive.length ? positive : entries).reduce((a, b) =>
      b.entry.match > a.entry.match ||
      (b.entry.match === a.entry.match && b.entry.score > a.entry.score)
        ? b
        : a,
    )

    results.push({
      appellation,
      score: best.entry.score,
      match: best.entry.match,
      drivingStyle: best.style,
      matchedTagIds: best.entry.matchedTagIds,
      positiveTagIds: best.entry.positiveTagIds,
      confirmedBy: best.entry.confirmedBy,
      styleScores,
    })
  }
  return results
}

/** Scores the user's bottles from raw `WineRecord`s (nullable `style`) — never from the
 *  display-oriented `UserWine`, which defaults a missing style to 'red'.
 *
 *  `appellationResults` must be the FULL, unfiltered, untruncated output of
 *  scoreAppellations, so every appellation a bottle points at is lookup-able. */
export function scoreCellarWines(
  wines: WineRecord[],
  matches: FoodTagMatch[],
  appellationResults: AppellationPairingResult[],
  baseline: WineStyleFoodPairingRecord[],
): CellarWineMatch[] {
  const byAppellationId = new Map(appellationResults.map((r) => [r.appellation.id, r]))
  const baselineByStyleTag = new Map(
    baseline.map((b) => [`${b.wine_style}:${b.food_tag_id}`, b.affinity]),
  )

  const fromEntry = (wine: WineRecord, style: WineStyle, entry: StyleScore): CellarWineMatch => ({
    wine,
    score: entry.score,
    match: entry.match,
    drivingStyle: style,
    positiveTagIds: entry.positiveTagIds,
    confirmedBy: entry.confirmedBy,
  })

  const results: CellarWineMatch[] = []
  for (const wine of wines) {
    const result = wine.appellation ? byAppellationId.get(wine.appellation) : undefined
    if (result) {
      const producedStyles = result.appellation.wine_styles ?? []

      if (wine.style) {
        // The bottle's OWN style, never the appellation's collapsed best: a suppression
        // recorded on exactly this style can't be masked by a better sibling style.
        const mapped = toAppellationStyle(wine.style)
        // Undefined when `mapped` isn't one of the appellation's real styles (stale data
        // after a retag): unscoreable, never substituted with the appellation's best.
        const entry = result.styleScores[mapped]
        if (entry && entry.score > 0) results.push(fromEntry(wine, mapped, entry))
        continue
      }

      // No style on the bottle: which of the appellation's styles it is cannot be known.
      // Only a single-style appellation is unambiguous; anything else is excluded, not guessed.
      const [only] = producedStyles
      if (producedStyles.length === 1 && only) {
        const entry = result.styleScores[only]
        if (entry && entry.score > 0) results.push(fromEntry(wine, only, entry))
      }
      continue
    }

    // No appellation, or one with no wine_styles: fall back to the style-only baseline.
    if (!wine.style) continue
    const style = toAppellationStyle(wine.style)
    const signals: TagSignal[] = []
    const positiveTagIds: string[] = []
    for (const m of matches) {
      const affinity = baselineByStyleTag.get(`${style}:${m.tag.id}`) ?? 0
      signals.push({ affinity, confidence: m.confidence })
      if (affinity > 0) positiveTagIds.push(m.tag.id)
    }
    const { score, match } = computeMatch(signals)
    if (score > 0) {
      results.push({ wine, score, match, drivingStyle: style, positiveTagIds, confirmedBy: [] })
    }
  }
  return results.sort(compareCellarMatches)
}

/** Bottles left out of cellar matching only because they have an appellation that makes
 *  several styles and no style of their own — the UI nudges the user to add one. */
export function winesNeedingStyle(
  wines: WineRecord[],
  appellationResults: AppellationPairingResult[],
): WineRecord[] {
  const byAppellationId = new Map(appellationResults.map((r) => [r.appellation.id, r]))
  return wines.filter((wine) => {
    if (wine.style || !wine.appellation) return false
    const result = byAppellationId.get(wine.appellation)
    return !!result && (result.appellation.wine_styles?.length ?? 0) > 1
  })
}

/** Best match first. Ties fall back to the raw score, then to the more specialised appellation
 *  (fewer styles), then name. The baseline rates whole styles, so appellations of one style share
 *  a fit until editorial or curated evidence separates them — the tie-breaks keep the rest stable. */
export function compareAppellationResults(
  a: AppellationPairingResult,
  b: AppellationPairingResult,
): number {
  return (
    b.match - a.match ||
    b.score - a.score ||
    (a.appellation.wine_styles?.length ?? 0) - (b.appellation.wine_styles?.length ?? 0) ||
    a.appellation.name.localeCompare(b.appellation.name)
  )
}

/** Best match first; ties go to the bottle the user rated higher (unrated last), then name. */
export function compareCellarMatches(a: CellarWineMatch, b: CellarWineMatch): number {
  return (
    b.match - a.match ||
    b.score - a.score ||
    (b.wine.rating ?? -1) - (a.wine.rating ?? -1) ||
    a.wine.name.localeCompare(b.wine.name)
  )
}

/** Tags in these categories name the dish's "parts"; results are only split by them.
 *  Modifiers (a cooking style, a flavour, a cuisine) refine every part, they aren't one. */
const MAIN_INGREDIENT_CATEGORIES: readonly FoodTagCategory[] = ['protein', 'seafood']

export function mainIngredientMatches(matches: FoodTagMatch[]): FoodTagMatch[] {
  return matches.filter((m) => MAIN_INGREDIENT_CATEGORIES.includes(m.tag.category))
}

export interface TagGroup<T> {
  /** Main-ingredient tags that drove these items; empty for an ungrouped list. */
  tagIds: string[]
  /** True when the items pair well with every main ingredient ("Great with both"). */
  coversAll: boolean
  items: T[]
}

/** Groups results by which main ingredients drove them, so a multi-part dish ("surf and
 *  turf") reads as "Best with the steak" / "Best with the shrimp" / "Great with both"
 *  instead of one mysterious ranked list. With fewer than two main ingredients there is
 *  nothing to split, so one ungrouped list comes back. Items driven only by modifiers go
 *  in a final ungrouped list. Items keep their order within a group — pass them sorted. */
export function groupByDrivingTags<T extends { positiveTagIds: string[] }>(
  items: T[],
  matches: FoodTagMatch[],
): TagGroup<T>[] {
  const mainIds = mainIngredientMatches(matches).map((m) => m.tag.id)
  if (mainIds.length <= 1) {
    return items.length ? [{ tagIds: [], coversAll: false, items }] : []
  }

  const groups = new Map<string, TagGroup<T>>()
  for (const item of items) {
    const tagIds = mainIds.filter((id) => item.positiveTagIds.includes(id))
    const coversAll = tagIds.length === mainIds.length
    const key = coversAll ? '*' : tagIds.join(',')
    const group = groups.get(key) ?? { tagIds, coversAll, items: [] }
    group.items.push(item)
    groups.set(key, group)
  }

  const rank = (group: TagGroup<T>) => (group.coversAll ? 0 : group.tagIds.length ? 1 : 2)
  return [...groups.values()].sort((a, b) => rank(a) - rank(b)) // stable: first-seen within a rank
}
