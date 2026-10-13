import { describe, expect, it } from 'vitest'
import {
  FOCUS_FILL,
  FOCUS_MAX_ZOOM,
  FULL_WINDOW,
  IDENTITY_VIEW,
  MAX_ZOOM,
  clampView,
  NO_MARGIN,
  isDefaultView,
  isZoomed,
  viewFocusing,
  viewGestured,
  viewLabelScale,
  viewOutlineScale,
  viewPanned,
  viewTransform,
  viewZoomedAt,
  type MapView,
} from '@/lib/mapZoom'

/** Where a point of the map (shares of its size) lands in the view (shares of the view). */
const project = (view: MapView, point: { x: number; y: number }) => ({
  x: view.x + view.k * point.x,
  y: view.y + view.k * point.y,
})

describe('viewFocusing', () => {
  it('centres a small area and zooms until it fills FOCUS_FILL of the view', () => {
    const box = { left: 0.5, top: 0.3, width: 0.08, height: 0.04 }
    const view = viewFocusing(box)

    expect(view.k).toBeCloseTo(FOCUS_FILL / 0.08)
    const centre = project(view, { x: 0.54, y: 0.32 })
    expect(centre.x).toBeCloseTo(0.5)
    expect(centre.y).toBeCloseTo(0.5)
  })

  it('stops at FOCUS_MAX_ZOOM for a speck', () => {
    const view = viewFocusing({ left: 0.5, top: 0.5, width: 0.002, height: 0.002 })
    expect(view.k).toBe(FOCUS_MAX_ZOOM)
  })

  it('leaves the map whole for an area that is already large', () => {
    expect(viewFocusing({ left: 0.1, top: 0.1, width: 0.8, height: 0.6 })).toEqual(IDENTITY_VIEW)
  })

  it('sizes by the longer side, so a tall area fits as well as a wide one', () => {
    const tall = viewFocusing({ left: 0.4, top: 0.4, width: 0.02, height: 0.1 })
    expect(tall.k).toBeCloseTo(FOCUS_FILL / 0.1)
  })

  it('does not pan past the edge when the area sits in a corner', () => {
    const view = viewFocusing({ left: 0, top: 0, width: 0.05, height: 0.05 })
    expect(view.x).toBe(0)
    expect(view.y).toBe(0)

    const far = viewFocusing({ left: 0.95, top: 0.95, width: 0.05, height: 0.05 })
    expect(far.x).toBeCloseTo(1 - far.k)
    expect(far.y).toBeCloseTo(1 - far.k)
  })

  it('ignores an empty box', () => {
    expect(viewFocusing({ left: 0.5, top: 0.5, width: 0, height: 0 })).toEqual(IDENTITY_VIEW)
  })
})

describe('viewFocusing in a window', () => {
  const box = { left: 0.5, top: 0.5, width: 0.04, height: 0.04 }

  it('is the same as before for the full window', () => {
    expect(viewFocusing(box, FULL_WINDOW)).toEqual(viewFocusing(box))
  })

  it('centres the area in the free part of the view, not the whole view', () => {
    // The bottom 40% is covered by a sheet.
    const window = { left: 0, top: 0.1, width: 1, height: 0.5 }
    const view = viewFocusing(box, window)

    const centre = project(view, { x: 0.52, y: 0.52 })
    expect(centre.x).toBeCloseTo(0.5)
    expect(centre.y).toBeCloseTo(0.35) // middle of 0.1…0.6
  })

  it('sizes the area for a short window by whichever side is tighter', () => {
    const tall = { left: 0.4, top: 0.4, width: 0.02, height: 0.1 }
    const window = { left: 0, top: 0, width: 1, height: 0.5 }
    expect(viewFocusing(tall, window).k).toBeCloseTo(FOCUS_FILL / (0.1 / 0.5))
  })

  it('ignores an empty window', () => {
    expect(viewFocusing(box, { left: 0, top: 0, width: 0, height: 0.5 })).toEqual(IDENTITY_VIEW)
  })
})

describe('viewGestured', () => {
  const anchor = { x: 0.6, y: 0.4 }

  it('keeps the point under the fingers still while pinching', () => {
    const from: MapView = { k: 2, x: -0.5, y: -0.3 }
    const under = { x: (anchor.x - from.x) / from.k, y: (anchor.y - from.y) / from.k }

    const next = viewGestured(from, { scale: 1.5, anchor, dx: 0, dy: 0 })

    expect(next.k).toBeCloseTo(3)
    const now = project(next, under)
    expect(now.x).toBeCloseTo(anchor.x)
    expect(now.y).toBeCloseTo(anchor.y)
  })

  it('carries the map along when the fingers move', () => {
    const from: MapView = { k: 3, x: -1, y: -1 }
    const next = viewGestured(from, { scale: 1, anchor, dx: 0.1, dy: -0.2 })
    expect(next.k).toBe(3)
    expect(next.x).toBeCloseTo(-0.9)
    expect(next.y).toBeCloseTo(-1.2)
  })

  it('does both at once', () => {
    const from: MapView = { k: 2, x: -0.5, y: -0.5 }
    const next = viewGestured(from, { scale: 2, anchor, dx: 0.05, dy: 0 })
    const under = { x: (anchor.x - from.x) / from.k, y: (anchor.y - from.y) / from.k }
    expect(project(next, under).x).toBeCloseTo(anchor.x + 0.05)
    expect(project(next, under).y).toBeCloseTo(anchor.y)
  })

  it('cannot pinch out past the whole map or in past the limit', () => {
    expect(viewGestured({ k: 2, x: -0.5, y: -0.5 }, { scale: 0.1, anchor, dx: 0, dy: 0 })).toEqual(
      IDENTITY_VIEW,
    )
    expect(viewGestured({ k: 10, x: -5, y: -5 }, { scale: 9, anchor, dx: 0, dy: 0 }).k).toBe(
      MAX_ZOOM,
    )
  })

  it('stays within the map when pushed past an edge', () => {
    const next = viewGestured({ k: 4, x: -1, y: -1 }, { scale: 1, anchor, dx: 5, dy: 5 })
    expect(next).toEqual({ k: 4, x: 0, y: 0 })
  })
})

describe('viewZoomedAt', () => {
  it('keeps the point under the anchor still', () => {
    const start: MapView = { k: 2, x: -0.4, y: -0.2 }
    const anchor = { x: 0.7, y: 0.3 }
    const before = (anchor.x - start.x) / start.k

    const next = viewZoomedAt(start, 1.5, anchor)

    expect(next.k).toBeCloseTo(3)
    expect(project(next, { x: before, y: (anchor.y - start.y) / start.k }).x).toBeCloseTo(anchor.x)
  })

  it('zooms about the centre by default', () => {
    const next = viewZoomedAt(IDENTITY_VIEW, 2)
    expect(project(next, { x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 })
  })

  it('stops at the limits', () => {
    expect(viewZoomedAt(IDENTITY_VIEW, 0.5)).toEqual(IDENTITY_VIEW)
    expect(viewZoomedAt({ k: MAX_ZOOM, x: -1, y: -1 }, 2).k).toBe(MAX_ZOOM)
  })

  it('zooming back out to 1 gives the whole map again', () => {
    expect(viewZoomedAt({ k: 1.5, x: -0.2, y: -0.1 }, 1 / 1.5)).toEqual(IDENTITY_VIEW)
  })
})

describe('viewPanned / clampView', () => {
  it('moves the map with the pointer', () => {
    const next = viewPanned({ k: 4, x: -1, y: -1 }, 0.25, -0.25)
    expect(next).toEqual({ k: 4, x: -0.75, y: -1.25 })
  })

  it('never shows beyond the map', () => {
    expect(viewPanned({ k: 4, x: -1, y: -1 }, 5, 5)).toEqual({ k: 4, x: 0, y: 0 })
    expect(viewPanned({ k: 4, x: -1, y: -1 }, -5, -5)).toEqual({ k: 4, x: -3, y: -3 })
  })

  it('cannot pan a map that is not zoomed', () => {
    expect(viewPanned(IDENTITY_VIEW, 0.3, 0.3)).toEqual(IDENTITY_VIEW)
  })

  it('caps the zoom', () => {
    expect(clampView({ k: 100, x: 0, y: 0 }).k).toBe(MAX_ZOOM)
  })
})

describe('viewTransform / isZoomed', () => {
  it('has no transform at rest', () => {
    expect(viewTransform(IDENTITY_VIEW)).toBeUndefined()
    expect(isZoomed(IDENTITY_VIEW)).toBe(false)
  })

  it('translates by a share of the stage, then scales', () => {
    const view: MapView = { k: 3, x: -0.5, y: -1 }
    expect(viewTransform(view)).toBe('translate(-50%, -100%) scale(3)')
    expect(isZoomed(view)).toBe(true)
  })
})

describe('viewLabelScale', () => {
  it('is 1 at rest and shrinks as the square root of the zoom', () => {
    expect(viewLabelScale(IDENTITY_VIEW)).toBe(1)
    expect(viewLabelScale({ k: 9, x: 0, y: 0 })).toBeCloseTo(1 / 3)
  })

  it('leaves labels growing on screen, only slower than the map', () => {
    const k = 9
    expect(k * viewLabelScale({ k, x: 0, y: 0 })).toBeCloseTo(3)
  })
})

describe('viewOutlineScale', () => {
  it('is 1 at rest and shrinks less than the label scale', () => {
    const zoomed: MapView = { k: 12, x: 0, y: 0 }
    expect(viewOutlineScale(IDENTITY_VIEW)).toBe(1)
    expect(viewOutlineScale(zoomed)).toBeLessThan(1)
    expect(viewOutlineScale(zoomed)).toBeGreaterThan(viewLabelScale(zoomed))
  })
})

describe('margins (a phone top bar and sheet)', () => {
  const margin = { top: 0.1, bottom: 0.25 }

  it('let the whole map be pulled clear of the sheet even when not zoomed', () => {
    const up = viewPanned(IDENTITY_VIEW, 0, -0.5, margin)
    expect(up).toEqual({ k: 1, x: 0, y: -0.25 })

    const down = viewPanned(IDENTITY_VIEW, 0, 0.5, margin)
    expect(down).toEqual({ k: 1, x: 0, y: 0.1 })
  })

  it('never allow sideways movement of a map that is not zoomed', () => {
    expect(viewPanned(IDENTITY_VIEW, 0.3, 0, margin).x).toBe(0)
  })

  it('widen the vertical range when zoomed in', () => {
    const view: MapView = { k: 4, x: -1, y: -1 }
    expect(viewPanned(view, 0, 9, margin).y).toBe(0.1)
    expect(viewPanned(view, 0, -9, margin).y).toBe(-3.25)
  })

  it('are respected when pinching and zooming', () => {
    const anchor = { x: 0.5, y: 0.5 }
    expect(viewGestured(IDENTITY_VIEW, { scale: 1, anchor, dx: 0, dy: -1 }, margin).y).toBe(-0.25)
    expect(viewZoomedAt(IDENTITY_VIEW, 1, anchor, margin)).toEqual(IDENTITY_VIEW)
  })

  it('let an area near the bottom of the map be centred in the free part of the view', () => {
    const box = { left: 0.25, top: 0.8, width: 0.5, height: 0.15 }
    const free = { left: 0, top: 0.1, width: 1, height: 0.65 } // sheet covers the bottom 25%
    const view = viewFocusing(box, free, margin)

    expect(view.k).toBe(1) // large for its window: no zoom, but it still moves clear of the sheet
    expect(project(view, { x: 0.5, y: 0.875 }).y).toBeCloseTo(0.625) // as far as the margin allows
  })

  it('default to no margin', () => {
    expect(clampView({ k: 1, x: 0.5, y: 0.5 })).toEqual(
      clampView({ k: 1, x: 0.5, y: 0.5 }, NO_MARGIN),
    )
    expect(viewPanned(IDENTITY_VIEW, 0, 0.5)).toEqual(IDENTITY_VIEW)
  })
})

describe('isDefaultView', () => {
  it('is true only for the whole map in place', () => {
    expect(isDefaultView(IDENTITY_VIEW)).toBe(true)
    expect(isDefaultView({ k: 1, x: 0, y: -0.2 })).toBe(false)
    expect(isDefaultView({ k: 2, x: 0, y: 0 })).toBe(false)
  })
})
