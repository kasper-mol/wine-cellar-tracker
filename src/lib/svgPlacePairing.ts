import type { WineMapDotPair } from '@/types/wineMaps'

/** Centre of a dot, in the SVG's own coordinates. */
export interface PlaceDotGeometry {
  id: string
  x: number
  y: number
}

/** Bounding box of a place name, in the same coordinates as the dots. */
export interface PlaceTextGeometry {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface PlacePairingResult {
  pairs: WineMapDotPair[]
  unpairedDotIds: string[]
  unpairedTextIds: string[]
}

/** 0 when the point is inside the box, else the straight-line distance to its nearest edge. */
function distanceToBox(dot: PlaceDotGeometry, box: PlaceTextGeometry): number {
  const dx = Math.max(box.x - dot.x, 0, dot.x - (box.x + box.width))
  const dy = Math.max(box.y - dot.y, 0, dot.y - (box.y + box.height))
  return Math.hypot(dx, dy)
}

/**
 * Pair each place name with the nearest dot. Greedy by distance: the closest candidate pair is
 * taken first, then both are off the table, so a dot is never shared by two names. Pairs further
 * apart than `maxDistance` are not made; their members come back as unpaired.
 */
export function pairDotsWithTexts(
  dots: PlaceDotGeometry[],
  texts: PlaceTextGeometry[],
  maxDistance = Infinity,
): PlacePairingResult {
  const candidates: { dot: PlaceDotGeometry; text: PlaceTextGeometry; distance: number }[] = []

  for (const text of texts) {
    for (const dot of dots) {
      const distance = distanceToBox(dot, text)
      if (distance <= maxDistance) candidates.push({ dot, text, distance })
    }
  }

  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      a.text.id.localeCompare(b.text.id) ||
      a.dot.id.localeCompare(b.dot.id),
  )

  const usedDots = new Set<string>()
  const usedTexts = new Set<string>()
  const pairs: WineMapDotPair[] = []

  for (const { dot, text } of candidates) {
    if (usedDots.has(dot.id) || usedTexts.has(text.id)) continue
    usedDots.add(dot.id)
    usedTexts.add(text.id)
    pairs.push({ textElementId: text.id, dotElementId: dot.id })
  }

  pairs.sort((a, b) => a.textElementId.localeCompare(b.textElementId))

  return {
    pairs,
    unpairedDotIds: dots.filter((dot) => !usedDots.has(dot.id)).map((dot) => dot.id),
    unpairedTextIds: texts.filter((text) => !usedTexts.has(text.id)).map((text) => text.id),
  }
}
