import { WINE_MAP_SIZE_SCALE } from '@/content/wineMapLayers'
import {
  collectLayerNodes,
  defaultSubtypeFor,
  localTag,
  namespaceSvgIds,
  parseViewBox,
  readPresentationProp,
  readSvgText,
  sanitizeSvg,
} from '@/lib/svgUtils'
import type { SvgLayerNode } from '@/lib/svgUtils'
import type { PlaceDotGeometry, PlaceTextGeometry } from '@/lib/svgPlacePairing'
import type { WineMapLayerElementDto, WineMapOverlayKind } from '@/types/wineMaps'

/* Colours, fonts and the halo come from the design tokens in src/assets/main.css as CSS
 * variable references, so they follow the theme without being read in JS. */
const WATER_FILL = 'var(--water-300)'
const WATER_STROKE = 'var(--water-500)'
const WATER_TEXT = 'var(--water-700)'
const PLACE_DOT = 'var(--accent-700)'
const PLACE_TEXT = 'var(--neutral-700)'
const HALO = 'hsl(var(--background))'
const FONT = 'var(--font-heading)'
/** Highlight for the element being edited in the manage portal. */
const SELECTED = 'hsl(var(--primary))'
const SELECTED_DOT_SCALE = 1.4
/** Width of the invisible outline that makes thin lines and small dots easy to click. */
const HIT_STROKE_WIDTH = 14

/** Halo width as a share of the font size / dot radius. */
const TEXT_HALO_RATIO = 0.22
const DOT_HALO_RATIO = 0.35
const FALLBACK_TEXT_SIZE = 12
/** A shape in the places layer is a dot only if it is no wider than this share of the map. */
const MAX_DOT_SHARE = 0.04

const LINE_SUBTYPES = new Set(['river', 'canal'])

export interface OverlayStyleInput {
  kind: WineMapOverlayKind
  elements: WineMapLayerElementDto[]
  /** Keys to highlight (a place's name and its dot). Manage portal only. */
  selectedKeys?: ReadonlySet<string>
  /** Add click targets around lines and dots. Manage portal only. */
  hitAreas?: boolean
}

export interface OverlayGeometry {
  dots: PlaceDotGeometry[]
  texts: PlaceTextGeometry[]
  /** Width of the map's coordinate system, to scale distances against. */
  viewBoxWidth: number
}

export function overlayIdPrefix(kind: WineMapOverlayKind): string {
  return `ov-${kind}-`
}

/**
 * Make an overlay SVG safe to inject next to the base map: scripts and handlers are stripped and
 * ids are prefixed so they cannot clash with the base map's or another overlay's.
 */
export function prepareOverlayMarkup(svgText: string, kind: WineMapOverlayKind): string {
  return namespaceSvgIds(sanitizeSvg(svgText), overlayIdPrefix(kind))
}

/* ----------------------------- inline style helpers ----------------------------- */

function readStyle(el: Element): Map<string, string> {
  const declarations = new Map<string, string>()
  for (const declaration of (el.getAttribute('style') ?? '').split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    const name = declaration.slice(0, colon).trim().toLowerCase()
    if (name) declarations.set(name, declaration.slice(colon + 1).trim())
  }
  return declarations
}

/** Set (or, with null, remove) inline style properties, keeping the file's other declarations. */
function patchStyle(el: Element, props: Record<string, string | null>) {
  const declarations = readStyle(el)
  for (const [name, value] of Object.entries(props)) {
    if (value === null) declarations.delete(name)
    else declarations.set(name, value)
  }
  el.setAttribute(
    'style',
    Array.from(declarations, ([name, value]) => `${name}:${value}`).join(';'),
  )
}

/* ----------------------------- originals ----------------------------- */

/* Styling is re-run when the admin edits a row, so what the file said must survive the first pass. */
const originalHasFill = new WeakMap<Element, boolean>()
const originalFontSize = new WeakMap<Element, number | null>()
const originalTextMarkup = new WeakMap<Element, string>()
const originalDotAttrs = new WeakMap<Element, Record<string, number>>()

function hasFillOf(node: SvgLayerNode): boolean {
  if (!originalHasFill.has(node.el)) originalHasFill.set(node.el, node.hasFill)
  return originalHasFill.get(node.el) as boolean
}

function fontSizeOf(part: Element): number | null {
  if (!originalFontSize.has(part)) {
    const match = /^([\d.]+)(px)?$/.exec(readPresentationProp(part, 'font-size') ?? '')
    originalFontSize.set(part, match ? parseFloat(match[1] as string) : null)
  }
  return originalFontSize.get(part) ?? null
}

/* ----------------------------- text ----------------------------- */

function collapse(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Show `displayText` instead of the file's text; null puts the file's own text back. */
function applyDisplayText(text: Element, displayText: string | null) {
  if (!originalTextMarkup.has(text)) originalTextMarkup.set(text, text.innerHTML)
  const original = originalTextMarkup.get(text) as string

  const wanted = displayText ? collapse(displayText) : ''
  if (!wanted) {
    if (text.innerHTML !== original) text.innerHTML = original
    return
  }
  if (collapse(readSvgText(text) ?? '') === wanted) return

  // Rebuild from the file's markup so the first tspan keeps its position.
  text.innerHTML = original
  const [first, ...rest] = Array.from(text.querySelectorAll('tspan'))
  if (first) {
    first.textContent = wanted
    for (const extra of rest) extra.remove()
  } else {
    text.textContent = wanted
  }
}

function styleText(text: Element, color: string, italic: boolean, scale: number) {
  const parts = [text, ...Array.from(text.querySelectorAll('tspan'))]
  const mainSize = fontSizeOf(text)

  for (const part of parts) {
    const ownSize = fontSizeOf(part)
    const size = ownSize ?? mainSize ?? FALLBACK_TEXT_SIZE
    const props: Record<string, string> = {
      fill: color,
      stroke: HALO,
      'paint-order': 'stroke',
      'stroke-linejoin': 'round',
      'stroke-width': (size * scale * TEXT_HALO_RATIO).toFixed(3),
      'font-family': FONT,
      'font-style': italic ? 'italic' : 'normal',
    }
    // Sizes in other units (em, %) are left as drawn.
    if (ownSize !== null) props['font-size'] = `${ownSize * scale}px`
    patchStyle(part, props)
  }
}

/* ----------------------------- shapes ----------------------------- */

function styleWaterShape(
  shape: Element,
  hasFill: boolean,
  subtype: string | null,
  selected: boolean,
) {
  const isLine = subtype !== null && subtype !== 'other' ? LINE_SUBTYPES.has(subtype) : !hasFill
  const props: Record<string, string> = {
    fill: isLine ? 'none' : WATER_FILL,
    stroke: selected ? SELECTED : WATER_STROKE,
  }
  // Keep the width drawn in Inkscape; only give shapes without one a visible outline.
  if (!(parseFloat(readPresentationProp(shape, 'stroke-width') ?? '') > 0)) {
    props['stroke-width'] = isLine ? '1' : '0.75'
  }
  patchStyle(shape, props)
}

/**
 * Dots are small. A larger shape in a places file (an area outline left in the export) is not a
 * dot and must not be drawn as one. Sizes are measured in the file's own units, before any scaling.
 */
function isDotSized(shape: Element, svg: Element): boolean {
  const viewBox = parseViewBox(svg.getAttribute('viewBox'))
  if (!viewBox) return true
  const limit = Math.max(viewBox.width, viewBox.height) * MAX_DOT_SHARE

  const tag = localTag(shape)
  const radiusAttr = tag === 'circle' ? 'r' : null
  if (radiusAttr) {
    const radius =
      originalDotAttrs.get(shape)?.[radiusAttr] ?? parseFloat(shape.getAttribute('r') ?? '')
    return !Number.isFinite(radius) || radius * 2 <= limit
  }

  try {
    const box = (shape as unknown as SVGGraphicsElement).getBBox()
    return Math.max(box.width, box.height) <= limit
  } catch {
    return true // not measurable (not rendered); keep it rather than drop it
  }
}

function scaleDot(dot: Element, scale: number) {
  const tag = localTag(dot)
  const attrs = tag === 'circle' ? ['r'] : tag === 'ellipse' ? ['rx', 'ry'] : []

  if (attrs.length) {
    const originals = originalDotAttrs.get(dot) ?? {}
    for (const name of attrs) {
      originals[name] ??= parseFloat(dot.getAttribute(name) ?? '')
      if (Number.isFinite(originals[name])) {
        dot.setAttribute(name, String((originals[name] as number) * scale))
      }
    }
    originalDotAttrs.set(dot, originals)
    return
  }

  // Other shapes scale about their own centre, unless a transform attribute would be overridden.
  if (!dot.hasAttribute('transform')) {
    patchStyle(dot, {
      'transform-box': 'fill-box',
      'transform-origin': 'center',
      transform: scale === 1 ? null : `scale(${scale})`,
    })
  }
}

function styleDot(dot: Element, scale: number, selected: boolean) {
  scaleDot(dot, selected ? scale * SELECTED_DOT_SCALE : scale)
  const radius = parseFloat(dot.getAttribute('r') ?? dot.getAttribute('rx') ?? '')
  patchStyle(dot, {
    fill: selected ? SELECTED : PLACE_DOT,
    stroke: HALO,
    'stroke-width': String(Number.isFinite(radius) ? (radius * DOT_HALO_RATIO).toFixed(3) : 1),
  })
}

/* ----------------------------- entry point ----------------------------- */

/**
 * Restyle an injected overlay: recolour it with the theme's tokens, then apply the portal's
 * per-element settings (visibility, text, size, subtype). Safe to run again after an edit.
 * Positions, stroke widths and font sizes stay as drawn in Inkscape.
 */
export function styleOverlay(
  container: Element,
  { kind, elements, selectedKeys, hitAreas = false }: OverlayStyleInput,
): void {
  const svg = container.querySelector('svg')
  if (!svg) return

  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  patchStyle(svg, { width: '100%', height: 'auto', display: 'block' })

  const rows = new Map(elements.map((element) => [element.svgElementId, element]))
  const dotOwners = new Map<string, WineMapLayerElementDto>()
  for (const element of elements) {
    if (element.dotSvgElementId) dotOwners.set(element.dotSvgElementId, element)
  }

  removeHitAreas(svg)
  const nodes = collectLayerNodes(svg, overlayIdPrefix(kind))
  const ignored = new Set<Element>()

  for (const node of nodes) {
    const selected = selectedKeys?.has(node.key) ?? false
    const isDot = kind === 'places' && node.type === 'shape'

    if (isDot && !isDotSized(node.el, svg)) {
      patchStyle(node.el, { display: 'none' })
      ignored.add(node.el)
      continue
    }
    // A dot takes its visibility and size from the name it is paired with.
    const governing = isDot ? dotOwners.get(node.key) : rows.get(node.key)

    patchStyle(node.el, { visibility: governing && !governing.isVisible ? 'hidden' : null })

    const scale = governing ? WINE_MAP_SIZE_SCALE[governing.sizeClass] : 1

    if (node.type === 'text') {
      applyDisplayText(node.el, governing?.displayText ?? null)
      if (kind === 'water') styleText(node.el, selected ? SELECTED : WATER_TEXT, true, scale)
      else styleText(node.el, selected ? SELECTED : PLACE_TEXT, false, scale)
    } else if (kind === 'water') {
      const hasFill = hasFillOf(node)
      const subtype = governing?.subtype ?? defaultSubtypeFor({ type: 'shape', hasFill }, 'water')
      styleWaterShape(node.el, hasFill, subtype, selected)
    } else {
      styleDot(node.el, scale, selected)
    }
  }

  if (hitAreas) addHitAreas(nodes.filter((node) => !ignored.has(node.el)))
}

/* ----------------------------- manage portal helpers ----------------------------- */

function removeHitAreas(svg: Element) {
  for (const hit of Array.from(svg.querySelectorAll('[data-ov-hit-for]'))) hit.remove()
}

/**
 * Copy each shape as a transparent, wide outline right after it. Rivers are a few pixels thick and
 * dots a few pixels wide, so without this they are hard to click; hidden shapes stay clickable too.
 */
function addHitAreas(nodes: SvgLayerNode[]) {
  for (const node of nodes) {
    if (node.type !== 'shape') continue

    const hit = node.el.cloneNode(false) as Element
    for (const name of ['id', 'inkscape:label', 'label', 'class', 'fill', 'stroke']) {
      hit.removeAttribute(name)
    }
    hit.setAttribute('data-ov-hit-for', node.key)
    hit.setAttribute(
      'style',
      `fill:transparent;stroke:transparent;stroke-width:${HIT_STROKE_WIDTH};pointer-events:all`,
    )
    node.el.after(hit)
  }
}

/**
 * Where each dot and name sits, in the overlay's own coordinates, measured from the rendered page
 * (so layer transforms and scaling are accounted for). Null while the overlay is hidden.
 */
export function measureOverlayGeometry(
  container: Element,
  kind: WineMapOverlayKind,
): OverlayGeometry | null {
  const svg = container.querySelector('svg')
  if (!svg) return null

  const box = svg.getBoundingClientRect()
  const viewBox = parseViewBox(svg.getAttribute('viewBox'))
  if (!viewBox || !box.width || !box.height) return null

  const toMap = (rect: DOMRect) => ({
    x: viewBox.minX + ((rect.left - box.left) / box.width) * viewBox.width,
    y: viewBox.minY + ((rect.top - box.top) / box.height) * viewBox.height,
    width: (rect.width / box.width) * viewBox.width,
    height: (rect.height / box.height) * viewBox.height,
  })

  const geometry: OverlayGeometry = { dots: [], texts: [], viewBoxWidth: viewBox.width }
  for (const node of collectLayerNodes(svg, overlayIdPrefix(kind))) {
    const rect = toMap(node.el.getBoundingClientRect())
    if (node.type === 'text') {
      geometry.texts.push({ id: node.key, ...rect })
    } else {
      geometry.dots.push({ id: node.key, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 })
    }
  }
  return geometry
}
