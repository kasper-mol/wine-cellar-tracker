/**
 * Zoom and pan for the wine map, as plain maths so it can be tested without a browser.
 *
 * A view is the map scaled by `k` about its top-left corner, then shifted by (`x`, `y`). The shift
 * is a share of the map's own width and height, so it holds for any rendered size. Every layer of
 * the map shares one page, so one view moves them all.
 */
export interface MapView {
  k: number
  x: number
  y: number
}

/** A rectangle on the map, as shares (0–1) of its width and height. */
export interface MapBox {
  left: number
  top: number
  width: number
  height: number
}

/**
 * The part of the view that is free to look at. A phone's bottom sheet and top bar cover the rest,
 * so an area is centred and sized for this window instead of the whole view.
 */
export interface MapWindow {
  left: number
  top: number
  width: number
  height: number
}

export const FULL_WINDOW: MapWindow = { left: 0, top: 0, width: 1, height: 1 }

/**
 * How far the map may be pulled past the view's top and bottom edges, as shares of its height. A
 * phone's top bar and sheet cover those strips, so the map must be able to move clear of them.
 */
export interface MapMargin {
  top: number
  bottom: number
}

export const NO_MARGIN: MapMargin = { top: 0, bottom: 0 }

export const MIN_ZOOM = 1
export const MAX_ZOOM = 16
/** Zooming on an area stops here, so a tiny appellation is framed with its surroundings. */
export const FOCUS_MAX_ZOOM = 12
/** A focused area takes at most this share of the view along its longer side. */
export const FOCUS_FILL = 0.4

export const IDENTITY_VIEW: MapView = { k: 1, x: 0, y: 0 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function isZoomed(view: MapView): boolean {
  return view.k > MIN_ZOOM
}

/** True when the map is shown whole and in place. */
export function isDefaultView({ k, x, y }: MapView): boolean {
  return k === MIN_ZOOM && x === 0 && y === 0
}

/**
 * Keep the map covering the whole view: zoom within limits, and never pan past an edge (beyond
 * the margin, if there is one).
 */
export function clampView({ k, x, y }: MapView, margin: MapMargin = NO_MARGIN): MapView {
  const zoom = clamp(k, MIN_ZOOM, MAX_ZOOM)
  return {
    k: zoom,
    x: clamp(x, 1 - zoom, 0),
    y: clamp(y, 1 - zoom - margin.bottom, margin.top),
  }
}

/**
 * Centre `box` in `window` and zoom so it fills `FOCUS_FILL` of it along its longer side, or as far
 * as the limits allow.
 */
export function viewFocusing(
  box: MapBox,
  window: MapWindow = FULL_WINDOW,
  margin: MapMargin = NO_MARGIN,
): MapView {
  if (!(window.width > 0) || !(window.height > 0)) return IDENTITY_VIEW

  const longest = Math.max(box.width / window.width, box.height / window.height)
  if (!(longest > 0)) return IDENTITY_VIEW

  const k = clamp(FOCUS_FILL / longest, MIN_ZOOM, FOCUS_MAX_ZOOM)
  const centreX = box.left + box.width / 2
  const centreY = box.top + box.height / 2
  return clampView(
    {
      k,
      x: window.left + window.width / 2 - k * centreX,
      y: window.top + window.height / 2 - k * centreY,
    },
    margin,
  )
}

/** A pinch or a two-finger drag, measured from where the gesture began. */
export interface MapGesture {
  /** Current finger distance over the starting distance. */
  scale: number
  /** Where the fingers started (midpoint), a share of the view: the point that stays under them. */
  anchor: { x: number; y: number }
  /** How far the midpoint has moved since, shares of the view. */
  dx: number
  dy: number
}

/**
 * The view a gesture leads to. Zoom and drag are combined before the limits are applied, so
 * hitting an edge mid-pinch does not distort the rest of the gesture.
 */
export function viewGestured(
  from: MapView,
  { scale, anchor, dx, dy }: MapGesture,
  margin: MapMargin = NO_MARGIN,
): MapView {
  const k = clamp(from.k * scale, MIN_ZOOM, MAX_ZOOM)
  const mapX = (anchor.x - from.x) / from.k
  const mapY = (anchor.y - from.y) / from.k
  return clampView({ k, x: anchor.x + dx - k * mapX, y: anchor.y + dy - k * mapY }, margin)
}

/** Zoom by `factor` while the point under `anchor` (a share of the view) stays where it is. */
export function viewZoomedAt(
  view: MapView,
  factor: number,
  anchor: { x: number; y: number } = { x: 0.5, y: 0.5 },
  margin: MapMargin = NO_MARGIN,
): MapView {
  return viewGestured(view, { scale: factor, anchor, dx: 0, dy: 0 }, margin)
}

/** Move the map by (`dx`, `dy`), shares of the view. */
export function viewPanned(
  view: MapView,
  dx: number,
  dy: number,
  margin: MapMargin = NO_MARGIN,
): MapView {
  return clampView({ k: view.k, x: view.x + dx, y: view.y + dy }, margin)
}

export function viewTransform(view: MapView): string | undefined {
  if (isDefaultView(view)) return undefined
  return `translate(${view.x * 100}%, ${view.y * 100}%) scale(${view.k})`
}

/**
 * How much names and dots shrink (in the map's own units) as it zooms in. The square root lets them
 * grow on screen, but slower than the map, so a zoomed-in map is not drowned in huge labels.
 */
export function viewLabelScale({ k }: MapView): number {
  return 1 / Math.sqrt(k)
}

/**
 * The same for the outline of the hovered or selected area, which must stay clearly heavier than
 * the borders around it, so it shrinks less.
 */
export function viewOutlineScale({ k }: MapView): number {
  return k ** -0.15
}
