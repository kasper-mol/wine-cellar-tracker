/**
 * Snap points for the phone map's bottom sheet, as plain maths so they can be tested without a
 * browser. Heights are how much of the sheet is visible, in pixels.
 */
export type SheetSnap = 'peek' | 'half' | 'full'

export interface SheetHeights {
  peek: number
  half: number
  /** The sheet's own height: everything below the top bar. */
  full: number
}

/** How far ahead (ms) a fling is projected when choosing where the sheet settles. */
const PROJECT_MS = 200
/** Never let two snaps sit closer than this, even on a very short screen. */
const MIN_STEP = 40

export interface SheetHeightOptions {
  /** Visible height of the peek, including the home-indicator inset. */
  peek: number
  /** Space kept free above a full sheet for the top bar. */
  topInset: number
}

/** Peek, half and full heights for a container `viewportHeight` tall. */
export function sheetHeights(
  viewportHeight: number,
  { peek, topInset }: SheetHeightOptions,
): SheetHeights {
  const full = Math.max(viewportHeight - topInset, peek + 2 * MIN_STEP)
  const half = Math.min(
    Math.max(Math.round(viewportHeight * 0.5), peek + MIN_STEP),
    full - MIN_STEP,
  )
  return { peek, half, full }
}

/** Keep a dragged height between peek and full. */
export function clampSheetHeight(height: number, { peek, full }: SheetHeights): number {
  return Math.min(full, Math.max(peek, height))
}

/**
 * Where the sheet settles when let go at `height`. `velocity` is px/ms, positive when the sheet is
 * rising; a fling carries it on towards the snap it is heading for.
 */
export function settleSheet(height: number, velocity: number, heights: SheetHeights): SheetSnap {
  const projected = height + velocity * PROJECT_MS
  const snaps: SheetSnap[] = ['peek', 'half', 'full']

  let best: SheetSnap = 'peek'
  for (const snap of snaps) {
    if (Math.abs(heights[snap] - projected) < Math.abs(heights[best] - projected)) best = snap
  }
  return best
}

/** What tapping the handle does: open up step by step, then fold back to half. */
export function nextSnap(snap: SheetSnap): SheetSnap {
  if (snap === 'peek') return 'half'
  if (snap === 'half') return 'full'
  return 'half'
}
