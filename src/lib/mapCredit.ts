import { MAP_DATA_SOURCES } from '@/content/mapDataSources'
import type { MapCreditPart } from '@/content/mapDataSources'

const SEPARATOR: MapCreditPart = { text: ' · ' }

/**
 * The credit line for a map's data sources, as parts a template can render without `v-html`.
 * Unknown ids and repeats are ignored; no sources means no credit.
 */
export function creditForSources(ids: readonly string[] | null | undefined): MapCreditPart[] {
  const wanted = new Set(ids ?? [])
  const parts: MapCreditPart[] = []

  for (const source of MAP_DATA_SOURCES) {
    if (!wanted.has(source.id)) continue
    if (parts.length) parts.push(SEPARATOR)
    parts.push(...source.credit)
  }

  return parts
}
