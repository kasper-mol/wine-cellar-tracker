import { WINE_STYLE_TOKENS } from '@/lib/appellationCopyForm'
import { FLAVOR_LEVELS } from '@/types/flavorDescriptors'
import type { AppellationFlavorRecord } from '@/types/appellationFlavors'
import type {
  FlavorClusterWithDescriptors,
  FlavorDescriptorRecord,
  FlavorLevel,
} from '@/types/flavorDescriptors'
import type { WineStyle } from '@/types/wineAppellations'

export interface FlavorProfileCluster {
  cluster: FlavorClusterWithDescriptors
  descriptors: FlavorDescriptorRecord[]
}

export interface FlavorProfileLevel {
  level: FlavorLevel
  clusters: FlavorProfileCluster[]
}

export interface FlavorProfileStyle {
  style: WineStyle
  levels: FlavorProfileLevel[]
  count: number
}

/**
 * Resolve appellation_flavors rows against the lexicon into
 * style → level → cluster → descriptors, keeping WSET order. Empty styles/levels drop out.
 */
export function buildFlavorProfile(
  rows: AppellationFlavorRecord[],
  clusters: FlavorClusterWithDescriptors[],
): FlavorProfileStyle[] {
  const idsByStyle = new Map<WineStyle, Set<string>>()
  for (const row of rows) {
    const set = idsByStyle.get(row.wine_style) ?? new Set<string>()
    set.add(row.descriptor_id)
    idsByStyle.set(row.wine_style, set)
  }

  return WINE_STYLE_TOKENS.flatMap((style) => {
    const ids = idsByStyle.get(style)
    if (!ids?.size) return []

    const levels = FLAVOR_LEVELS.flatMap((level) => {
      const levelClusters = clusters
        .filter((cluster) => cluster.level === level)
        .map((cluster) => ({
          cluster,
          descriptors: cluster.descriptors.filter((d) => ids.has(d.id)),
        }))
        .filter((entry) => entry.descriptors.length)
      return levelClusters.length ? [{ level, clusters: levelClusters }] : []
    })

    return [{ style, levels, count: ids.size }]
  })
}
