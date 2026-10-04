import type { SvgViewBox, WineMapOverlayKind } from '@/types/wineMaps'

export function normalizeSvgKey(value: string): string {
  return value.trim().toLowerCase()
}

function isGenericSvgId(value: string): boolean {
  const n = normalizeSvgKey(value)
  return /^layer\d+$/.test(n) || /^path\d+$/.test(n) || /^g\d+$/.test(n)
}

function pickSvgAreaKey(el: Element): string | null {
  const label = el.getAttribute('inkscape:label') || el.getAttribute('label')
  const id = el.getAttribute('id')

  if (label && normalizeSvgKey(label).length > 0) return normalizeSvgKey(label)
  if (id && normalizeSvgKey(id).length > 0 && !isGenericSvgId(id)) return normalizeSvgKey(id)
  return null
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load SVG from ${url}`)
  return response.text()
}

export function extractSvgAreaKeys(svgText: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const keys = new Set<string>()

  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (isInsideNonArea(el)) continue

    const groupMode = el.getAttribute('inkscape:groupmode')
    const hasLabel = Boolean(el.getAttribute('inkscape:label') || el.getAttribute('label'))
    const tag = el.tagName.toLowerCase()

    const isLayer = groupMode === 'layer' && hasLabel
    const isDirectShape = ['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(tag)
    if (!isLayer && !isDirectShape) continue

    const key = pickSvgAreaKey(el)
    if (key) keys.add(key)
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}

/** Definitions (clip rectangles, path effects) and the overlay layers are not map areas. */
function isInsideNonArea(el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (NON_RENDERING_TAGS.has(localTag(node)) || overlayKindOf(node)) return true
  }
  return false
}

/* ----------------------------- OVERLAY LAYERS ----------------------------- */

export interface SvgLayerElement {
  /** `inkscape:label` (lowercased) when set, else the id as written. Used to find the element again. */
  key: string
  type: 'text' | 'shape'
  /** Whitespace-collapsed text of a `<text>`; null for shapes. */
  text: string | null
  /** False for stroke-only shapes (`fill:none`); texts and unspecified fills count as filled. */
  hasFill: boolean
}

export interface SvgLayerElementExtract {
  elements: SvgLayerElement[]
  /** Keys carried by more than one SVG element; only the first is kept. */
  duplicateKeys: string[]
}

const LAYER_SHAPE_TAGS = new Set([
  'path',
  'polygon',
  'polyline',
  'rect',
  'circle',
  'ellipse',
  'line',
])

/** Subtrees that never draw anything on their own, so they hold no layer elements. */
const NON_RENDERING_TAGS = new Set([
  'defs',
  'metadata',
  'namedview',
  'clippath',
  'mask',
  'pattern',
  'marker',
  'symbol',
  'style',
  'title',
  'desc',
  'script',
  'lineargradient',
  'radialgradient',
  'filter',
])

/** Names that turn an Inkscape layer into an overlay instead of a map area. */
const OVERLAY_LAYER_NAMES: Record<string, WineMapOverlayKind> = {
  water: 'water',
  places: 'places',
}

/**
 * The overlay a group stands for: its `inkscape:label` (or, when the file was saved without
 * Inkscape's extras, its id) is `water` or `places`, in any letter case.
 */
export function overlayKindOf(el: Element): WineMapOverlayKind | null {
  if (localTag(el) !== 'g') return null
  const name = (el.getAttribute('inkscape:label') || el.getAttribute('id') || '')
    .trim()
    .toLowerCase()
  return OVERLAY_LAYER_NAMES[name] ?? null
}

/** Elements and attributes removed before an uploaded SVG is injected into the page. */
const UNSAFE_TAGS = new Set([
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'style',
  'animate',
  'animatetransform',
  'animatemotion',
  'set',
])

export function localTag(el: Element): string {
  return (el.localName || el.tagName).toLowerCase()
}

function parseSvgDocument(svgText: string): Document {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  } catch {
    throw new Error('Invalid SVG file')
  }
  const root = doc.documentElement
  if (doc.getElementsByTagName('parsererror').length || !root || localTag(root) !== 'svg') {
    throw new Error('Invalid SVG file')
  }
  return doc
}

/** Value of a presentation property from the `style` attribute, else the attribute of the same name. */
export function readPresentationProp(el: Element, prop: string): string | null {
  const style = el.getAttribute('style')
  if (style) {
    for (const declaration of style.split(';')) {
      const [name, ...rest] = declaration.split(':')
      if (name?.trim().toLowerCase() === prop) return rest.join(':').trim().toLowerCase()
    }
  }
  const attr = el.getAttribute(prop)
  return attr ? attr.trim().toLowerCase() : null
}

function isHiddenElement(el: Element): boolean {
  return readPresentationProp(el, 'display') === 'none'
}

/** Nearest explicit `fill` on the element or an ancestor decides; SVG's default fill is black. */
function resolveHasFill(el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const fill = readPresentationProp(node, 'fill')
    if (fill !== null) return fill !== 'none'
  }
  return true
}

/** Label (lowercased) if set, else the id with `idPrefix` (added by `namespaceSvgIds`) removed. */
function pickLayerElementKey(el: Element, idPrefix: string): string | null {
  const label = (el.getAttribute('inkscape:label') || el.getAttribute('label') || '').trim()
  if (label) return normalizeSvgKey(label)
  const id = (el.getAttribute('id') || '').trim()
  if (!id) return null
  return id.startsWith(idPrefix) ? id.slice(idPrefix.length) : id
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** Text of a `<text>`; Inkscape's separate line tspans are joined with a space. */
export function readSvgText(el: Element): string | null {
  const lines = Array.from(el.children).filter(
    (child) => child.getAttribute('sodipodi:role') === 'line',
  )
  const raw = lines.length
    ? lines.map((line) => line.textContent ?? '').join(' ')
    : (el.textContent ?? '')
  return collapseWhitespace(raw) || null
}

function walkLayerContent(node: Element, visit: (el: Element) => void) {
  for (const child of Array.from(node.children)) {
    const tag = localTag(child)
    if (NON_RENDERING_TAGS.has(tag) || isHiddenElement(child)) continue

    if (tag === 'text' || LAYER_SHAPE_TAGS.has(tag)) visit(child)
    else walkLayerContent(child, visit)
  }
}

export interface SplitOverlayLayers {
  /** The SVG without its overlay layers: the map areas only. */
  baseSvg: string
  /** Each overlay layer as an SVG of its own, with the same size, definitions and transforms. */
  overlays: Partial<Record<WineMapOverlayKind, string>>
}

function overlayLayersOf(root: Element): Map<WineMapOverlayKind, Element> {
  const found = new Map<WineMapOverlayKind, Element>()
  for (const el of Array.from(root.querySelectorAll('g'))) {
    const kind = overlayKindOf(el)
    if (kind && !found.has(kind)) found.set(kind, el)
  }
  return found
}

/** Remove everything except `target`, its ancestors (which may carry transforms) and `<defs>`. */
function keepOnlyBranch(root: Element, target: Element) {
  for (let node: Element = target; node !== root; ) {
    const parent = node.parentElement as Element
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && localTag(sibling) !== 'defs') sibling.remove()
    }
    node = parent
  }
}

/**
 * Pull the `water` and `places` layers out of a map's SVG. The map is drawn from `baseSvg`; each
 * overlay is its own SVG so it can be stacked, toggled and styled separately. Overlays keep the
 * page size of the file, so they line up with the map by construction.
 */
export function splitOverlayLayers(svgText: string): SplitOverlayLayers {
  const doc = parseSvgDocument(svgText)
  const kinds = Array.from(overlayLayersOf(doc.documentElement).keys())

  const overlays: SplitOverlayLayers['overlays'] = {}
  for (const kind of kinds) {
    const copy = parseSvgDocument(svgText)
    const layer = overlayLayersOf(copy.documentElement).get(kind)
    if (!layer) continue
    keepOnlyBranch(copy.documentElement, layer)
    overlays[kind] = new XMLSerializer().serializeToString(copy)
  }

  for (const layer of overlayLayersOf(doc.documentElement).values()) layer.remove()
  return { baseSvg: new XMLSerializer().serializeToString(doc), overlays }
}

export interface SvgLayerNode extends SvgLayerElement {
  el: Element
}

/**
 * Every text and shape of a flat overlay SVG, in document order, with the live element.
 * Groups and Inkscape layers are plain containers; hidden subtrees are skipped. Elements without a
 * label or id cannot be addressed and are left out. Several nodes can share a key.
 */
export function collectLayerNodes(svgRoot: Element, idPrefix = ''): SvgLayerNode[] {
  const nodes: SvgLayerNode[] = []

  walkLayerContent(svgRoot, (el) => {
    const key = pickLayerElementKey(el, idPrefix)
    if (!key) return

    const isText = localTag(el) === 'text'
    nodes.push({
      el,
      key,
      type: isText ? 'text' : 'shape',
      text: isText ? readSvgText(el) : null,
      hasFill: isText ? true : resolveHasFill(el),
    })
  })

  return nodes
}

/** The layer elements of an overlay SVG file, one per key (the first wins). */
export function extractSvgLayerElements(svgText: string): SvgLayerElementExtract {
  const doc = parseSvgDocument(svgText)
  const byKey = new Map<string, SvgLayerElement>()
  const duplicates = new Set<string>()

  for (const node of collectLayerNodes(doc.documentElement)) {
    if (byKey.has(node.key)) {
      duplicates.add(node.key)
      continue
    }
    byKey.set(node.key, {
      key: node.key,
      type: node.type,
      text: node.text,
      hasFill: node.hasFill,
    })
  }

  return {
    elements: Array.from(byKey.values()),
    duplicateKeys: Array.from(duplicates).sort((a, b) => a.localeCompare(b)),
  }
}

/** Rivers are drawn stroke-only, lakes and seas filled; everything else is set in the portal. */
export function defaultSubtypeFor(
  element: Pick<SvgLayerElement, 'type' | 'hasFill'>,
  kind: WineMapOverlayKind,
): string | null {
  if (kind === 'water' && element.type === 'shape') return element.hasFill ? 'lake' : 'river'
  return null
}

export function parseViewBox(value: string | null | undefined): SvgViewBox | null {
  if (!value) return null
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  const [minX, minY, width, height] = parts as [number, number, number, number]
  return width > 0 && height > 0 ? { minX, minY, width, height } : null
}

const URL_REFERENCE = /url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g

/**
 * Prefix every id and the references to it (`url(#…)`, `href="#…"`), so two inline SVGs in one
 * page cannot capture each other's gradients, clip paths or text paths.
 */
export function namespaceSvgIds(svgText: string, prefix: string): string {
  const doc = parseSvgDocument(svgText)

  for (const el of Array.from(doc.querySelectorAll('*'))) {
    const id = el.getAttribute('id')
    if (id) el.setAttribute('id', `${prefix}${id}`)

    for (const attr of Array.from(el.attributes)) {
      if (attr.name === 'id') continue
      const isHref = attr.localName === 'href' && attr.value.startsWith('#')
      if (isHref) {
        el.setAttributeNS(attr.namespaceURI, attr.name, `#${prefix}${attr.value.slice(1)}`)
      } else if (attr.value.includes('url(')) {
        el.setAttributeNS(
          attr.namespaceURI,
          attr.name,
          attr.value.replace(
            URL_REFERENCE,
            (_m, quote, ref) => `url(${quote}#${prefix}${ref}${quote})`,
          ),
        )
      }
    }
  }

  return new XMLSerializer().serializeToString(doc)
}

function isSafeHref(value: string): boolean {
  const compact = value.replace(/[\u0000- ]/g, '').toLowerCase()
  return compact.startsWith('#') || /^data:image\/(png|jpe?g|gif|webp);/.test(compact)
}

/**
 * Strip what could run code or restyle the host page from an SVG before it is injected with
 * `v-html`: scripts, foreign content, `<style>`, animations, `on*` handlers and non-local links.
 */
export function sanitizeSvg(svgText: string): string {
  const doc = parseSvgDocument(svgText)

  for (const el of Array.from(doc.querySelectorAll('*'))) {
    if (UNSAFE_TAGS.has(localTag(el))) {
      el.remove()
      continue
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const isHref = attr.localName.toLowerCase() === 'href'
      if (name.startsWith('on') || (isHref && !isSafeHref(attr.value))) {
        el.removeAttributeNode(attr)
      }
    }
  }

  return new XMLSerializer().serializeToString(doc)
}
