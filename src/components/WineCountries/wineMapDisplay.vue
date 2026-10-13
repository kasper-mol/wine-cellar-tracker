<script setup lang="ts">
import { useEventListener, useMediaQuery } from '@vueuse/core'
import { Maximize2, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import MapAreaDetail from '@/components/WineCountries/MapAreaDetail.vue'
import MapAreaList from '@/components/WineCountries/MapAreaList.vue'
import MapAreaSheet from '@/components/WineCountries/MapAreaSheet.vue'
import MapLayerToggles from '@/components/WineCountries/MapLayerToggles.vue'
import WineMapCanvas from '@/components/WineCountries/WineMapCanvas.vue'
import {
  WINE_MAP_OVERLAY_DEFAULT_STACK,
  WINE_MAP_OVERLAY_KINDS,
  WINE_MAP_OVERLAY_LABELS,
} from '@/content/wineMapLayers'
import { creditForSources } from '@/lib/mapCredit'
import { sheetHeights, type SheetSnap } from '@/lib/sheetSnap'
import { fetchSvgText, parseViewBox, sanitizeSvg, splitOverlayLayers } from '@/lib/svgUtils'
import { prepareOverlayMarkup } from '@/lib/wineMapOverlay'
import { useWineMapsStore } from '@/stores/wineMaps'
import type { WineMapCanvasOverlay, WineMapDto, WineMapOverlayKind } from '@/types/wineMaps'

const props = withDefaults(
  defineProps<{
    mapKey: string
    showAreaList?: boolean
    /** The line under the heading: what a visitor can do with the map. */
    hint?: string
  }>(),
  {
    showAreaList: true,
    hint: 'Select an area on the map, or pick one from the list.',
  },
)

/** The tallest the map may be: most of a screen, but never a poster on a big monitor. */
const MAP_MAX_HEIGHT = 'min(78vh, 780px)'

const wineMapsStore = useWineMapsStore()

const canvas = ref<InstanceType<typeof WineMapCanvas> | null>(null)
/** The base map's own container: area lookups stay inside it, away from the overlays. */
const mapContainer = computed<HTMLElement | null>(() => canvas.value?.baseContainer ?? null)
const svgMarkup = ref('')
const overlays = ref<WineMapCanvasOverlay[]>([])
const visibleKinds = ref<WineMapOverlayKind[]>([])
let loadToken = 0

const selectedAreaId = ref<string | null>(null)
const hoveredAreaId = ref<string | null>(null)

const activeAreaId = computed(() => hoveredAreaId.value ?? selectedAreaId.value ?? null)

const currentMap = computed(() => wineMapsStore.currentMap)

const hasMap = computed(() => Boolean(currentMap.value))
const creditParts = computed(() => creditForSources(currentMap.value?.dataSources))
const hasSvg = computed(() => Boolean(svgMarkup.value))

const overlayToggles = computed(() =>
  overlays.value.map((overlay) => ({
    kind: overlay.kind,
    label: WINE_MAP_OVERLAY_LABELS[overlay.kind],
    active: visibleKinds.value.includes(overlay.kind),
  })),
)

function toggleOverlay(kind: WineMapOverlayKind) {
  visibleKinds.value = visibleKinds.value.includes(kind)
    ? visibleKinds.value.filter((item) => item !== kind)
    : [...visibleKinds.value, kind]
}
const NON_CLICKABLE_FILL = 'transparent'

/* Areas are drawn as a light tint plus a stroke — never a solid accent fill.
 * The values come from the Classical ramps declared in src/assets/main.css. */
const AREA_TOKENS = {
  baseFill: '--accent-100',
  baseStroke: '--accent-500',
  hoverFill: '--accent-200',
  hoverStroke: '--accent-600',
  selectedFill: '--accent-200',
  selectedStroke: '--accent-700',
  inertStroke: '--neutral-400',
} as const

type AreaPalette = Record<keyof typeof AREA_TOKENS, string>
type AreaState = 'base' | 'hover' | 'selected'

const SVG_NS = 'http://www.w3.org/2000/svg'

/* Widths are in the map's own units. Zoomed in they shrink (the canvas sets the scale variables),
 * otherwise borders would swell with the map and bury the highlight; the highlight shrinks less. */
const strokeWidth = (units: number, scale: string) => `calc(${units}px * var(${scale}, 1))`

const BASE_STROKE_WIDTH = strokeWidth(1, '--map-label-scale')
const INERT_STROKE_WIDTH = strokeWidth(0.75, '--map-label-scale')
const HOVER_STROKE_WIDTH = strokeWidth(1.4, '--map-outline-scale')
const SELECTED_STROKE_WIDTH = strokeWidth(1.75, '--map-outline-scale')

let palette: AreaPalette | null = null

function readPalette(): AreaPalette {
  const styles = getComputedStyle(document.documentElement)

  return Object.fromEntries(
    Object.entries(AREA_TOKENS).map(([role, token]) => {
      const value = styles.getPropertyValue(token).trim()
      return [role, value || (role.endsWith('Fill') ? 'transparent' : 'currentColor')]
    }),
  ) as AreaPalette
}

function getPalette(): AreaPalette {
  palette ??= readPalette()
  return palette
}

function isAreaVisible(area: unknown) {
  if (area && typeof area === 'object' && 'isVisible' in area) {
    return ((area as { isVisible?: boolean }).isVisible ?? true) as boolean
  }
  return true
}

function isInteractiveArea(area: { isDecorative: boolean; isClickable: boolean }) {
  return !area.isDecorative && area.isClickable
}

const areaItems = computed(() =>
  (currentMap.value?.areas ?? [])
    .filter((area) => isAreaVisible(area) && isInteractiveArea(area))
    .map((area) => ({
      id: area.svgAreaId,
      displayName: area.label ?? toDisplayName(area.svgAreaId),
      area,
    })),
)

const selectedItem = computed(
  () => areaItems.value.find((item) => item.id === selectedAreaId.value) ?? null,
)

/** Width / height of the map's page. Every layer shares it, so one cap sizes them all. */
const mapAspect = ref<number | null>(null)

/** Capping the width at (max height × aspect) keeps tall maps on screen and lets wide ones fill. */
const canvasStyle = computed(() =>
  mapAspect.value ? { maxWidth: `calc(${MAP_MAX_HEIGHT} * ${mapAspect.value})` } : undefined,
)

function readMapAspect(svg: SVGElement): number | null {
  const viewBox = parseViewBox(svg.getAttribute('viewBox'))
  if (viewBox?.width && viewBox.height) return viewBox.width / viewBox.height

  const width = parseFloat(svg.getAttribute('width') ?? '')
  const height = parseFloat(svg.getAttribute('height') ?? '')
  return width > 0 && height > 0 ? width / height : null
}

function normalizeSvgKey(value: string) {
  return value.trim().toLowerCase()
}

function toDisplayName(value: string) {
  return value
    .replace(/^.*?_/, '')
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

interface LoadedMap {
  baseMarkup: string
  overlays: WineMapCanvasOverlay[]
  visibleKinds: WineMapOverlayKind[]
}

/**
 * One SVG per map: the areas are the file minus its `water` and `places` layers, and those layers
 * become the overlays. Settings from the portal apply when they exist; a layer nobody has
 * configured is shown with defaults. A layer that fails to prepare is skipped, the map is not.
 */
async function loadMapSvg(map: WineMapDto, svgAssetPath: string): Promise<LoadedMap> {
  const split = splitOverlayLayers(await fetchSvgText(svgAssetPath))

  const overlays: WineMapCanvasOverlay[] = []
  const visible: WineMapOverlayKind[] = []
  for (const kind of WINE_MAP_OVERLAY_KINDS) {
    const layerSvg = split.overlays[kind]
    if (!layerSvg) continue

    const settings = map.layers.find((layer) => layer.kind === kind)
    if (settings && !settings.isEnabled) continue

    try {
      overlays.push({
        id: settings?.id ?? `default-${kind}`,
        kind,
        markup: prepareOverlayMarkup(layerSvg, kind),
        stack: settings?.stack ?? WINE_MAP_OVERLAY_DEFAULT_STACK[kind],
        opacity: settings?.opacity ?? 1,
        elements: settings?.elements ?? [],
      })
      if (settings?.defaultVisible ?? true) visible.push(kind)
    } catch (error) {
      console.warn(`Wine map ${kind} layer failed to load`, error)
    }
  }

  return { baseMarkup: sanitizeSvg(split.baseSvg), overlays, visibleKinds: visible }
}

function getAreaElement(svgAreaId: string): HTMLElement | null {
  if (!mapContainer.value) return null

  const byId = mapContainer.value.querySelector(`#${CSS.escape(svgAreaId)}`) as HTMLElement | null
  if (byId) return byId

  const allElements = Array.from(
    mapContainer.value.querySelectorAll<HTMLElement>('g, path, polygon, rect, circle, ellipse'),
  )

  return (
    allElements.find((el) => {
      const label = el.getAttribute('inkscape:label') || el.getAttribute('label')
      return label ? normalizeSvgKey(label) === normalizeSvgKey(svgAreaId) : false
    }) ?? null
  )
}

function getShapeElements(root: HTMLElement): HTMLElement[] {
  const tagName = root.tagName.toLowerCase()

  if (['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(tagName)) {
    return [root]
  }

  return Array.from(root.querySelectorAll<HTMLElement>('path, polygon, rect, circle, ellipse'))
}

function applyShapeBaseStyles(shape: HTMLElement, nonClickableArea: boolean) {
  const { baseFill: tintFill, baseStroke: tintStroke, inertStroke } = getPalette()
  const baseFill = nonClickableArea ? NON_CLICKABLE_FILL : tintFill
  const baseStroke = nonClickableArea ? inertStroke : tintStroke

  shape.dataset.baseFill = baseFill
  shape.dataset.baseStroke = baseStroke

  shape.style.fill = baseFill
  shape.setAttribute('fill', baseFill)
  if (nonClickableArea) {
    shape.style.setProperty('fill', NON_CLICKABLE_FILL, 'important')
    shape.setAttribute('fill', NON_CLICKABLE_FILL)
  }

  shape.style.stroke = baseStroke
  shape.setAttribute('stroke', baseStroke)
  shape.style.strokeWidth = nonClickableArea ? INERT_STROKE_WIDTH : BASE_STROKE_WIDTH
  shape.style.transition = 'fill 150ms ease, stroke 150ms ease, stroke-width 150ms ease'
}

function applyShapeInteractivity(shape: HTMLElement, interactive: boolean) {
  shape.style.cursor = interactive ? 'pointer' : 'default'
  shape.style.pointerEvents = interactive ? 'auto' : 'none'
}

function resolveAreaState(svgAreaId: string): AreaState {
  if (svgAreaId === hoveredAreaId.value) return 'hover'
  if (svgAreaId === selectedAreaId.value) return 'selected'
  return 'base'
}

function parseHex(color: string): [number, number, number] | null {
  const match = /^#([\da-f]{6})$/i.exec(color.trim())
  if (!match) return null
  const value = parseInt(match[1] as string, 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

/** The colour that, multiplied over `base`, gives `target`. */
function multiplierFor(target: string, base: string): string {
  const to = parseHex(target)
  const from = parseHex(base)
  if (!to || !from) return target
  const channel = (i: number) =>
    from[i] ? Math.min(255, Math.round((255 * (to[i] as number)) / (from[i] as number))) : 255
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

/**
 * A copy of an area to draw on the highlight layer. It keeps the area's position (including the
 * transforms of the groups around it) but not its id, label or listeners, so lookups and clicks
 * still reach the original.
 */
function cloneAreaForHighlight(
  el: HTMLElement,
  svg: Element,
  paint: (shape: HTMLElement) => void,
): Element {
  const clone = el.cloneNode(true) as HTMLElement
  for (const node of [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]) {
    for (const attr of ['id', 'inkscape:label', 'label', 'data-bound']) node.removeAttribute(attr)
  }
  for (const shape of getShapeElements(clone)) {
    shape.style.transition = 'none'
    shape.style.pointerEvents = 'none'
    shape.style.cursor = 'default'
    paint(shape)
  }

  let placed: Element = clone
  for (
    let parent: Element | null = el.parentElement;
    parent && parent !== svg;
    parent = parent.parentElement
  ) {
    const wrapper = document.createElementNS(SVG_NS, 'g')
    const transform = parent.getAttribute('transform')
    if (transform) wrapper.setAttribute('transform', transform)
    wrapper.append(placed)
    placed = wrapper
  }
  return placed
}

/**
 * Highlights are drawn on a layer above the whole map instead of recolouring the area in place:
 * areas overlap (a broad appellation lies under its villages and crus), and recolouring the
 * lower one leaves the upper ones covering it. The layer ignores the pointer, so hover and
 * click still go to the shapes underneath.
 */
function applyHighlightState() {
  const svg = mapContainer.value?.querySelector('svg')
  if (!svg) return
  svg.querySelector('[data-highlight-layer]')?.remove()

  const active = (currentMap.value?.areas ?? [])
    .filter((area) => isAreaVisible(area) && isInteractiveArea(area))
    .map((area) => ({ id: area.svgAreaId, state: resolveAreaState(area.svgAreaId) }))
    .filter((item) => item.state !== 'base')
    .sort((a, b) => Number(a.state === 'hover') - Number(b.state === 'hover'))
  if (!active.length) return

  const { baseFill, hoverFill, hoverStroke, selectedFill, selectedStroke } = getPalette()
  const layer = document.createElementNS(SVG_NS, 'g')
  layer.setAttribute('data-highlight-layer', 'true')
  layer.setAttribute('pointer-events', 'none')

  // Tint multiplied over what is below, so every area inside the outline stays visible.
  const tints = document.createElementNS(SVG_NS, 'g')
  tints.style.mixBlendMode = 'multiply'
  // Outline in the exact highlight colour, above everything.
  const outlines = document.createElementNS(SVG_NS, 'g')

  for (const { id, state } of active) {
    const el = getAreaElement(id)
    if (!el) continue

    const selected = state === 'selected'
    const tint = multiplierFor(selected ? selectedFill : hoverFill, baseFill)

    tints.append(
      cloneAreaForHighlight(el, svg, (shape) => {
        shape.style.fill = tint
        shape.style.stroke = 'none'
      }),
    )
    outlines.append(
      cloneAreaForHighlight(el, svg, (shape) => {
        shape.style.fill = 'none'
        shape.style.stroke = selected ? selectedStroke : hoverStroke
        shape.style.strokeWidth = selected ? SELECTED_STROKE_WIDTH : HOVER_STROKE_WIDTH
      }),
    )
  }

  layer.append(tints, outlines)
  svg.append(layer)
}

function setHoveredArea(svgAreaId: string | null) {
  // A tap "hovers" what it touches and nothing ever un-hovers it, which would leave the area
  // stuck in its hover colour over the selected one.
  if (svgAreaId !== null && !canHover.value) return
  hoveredAreaId.value = svgAreaId
  applyHighlightState()
}

/* ----------------------------- phone: full-screen explorer ----------------------------- */

/** Below the page's `lg` breakpoint the map is a preview; tapping it opens the explorer. */
const compact = useMediaQuery('(max-width: 1023.98px)')
const canHover = useMediaQuery('(hover: hover)')

const route = useRoute()
const router = useRouter()

/** The explorer lives in the URL, so the phone's back gesture closes it instead of leaving the page. */
const EXPLORER_QUERY = 'map'
const expanded = computed(() => compact.value && route.query[EXPLORER_QUERY] === 'open')
let openedHere = false

const interaction = computed(() => (expanded.value ? 'touch' : compact.value ? 'none' : 'pointer'))

/** The line under the heading; a phone taps the map instead of pointing at it. */
const heading = computed(() =>
  compact.value ? 'Tap the map to explore it, or pick an area from the list.' : props.hint,
)

/** Top bar: 44px buttons plus the gap above and below. */
const BAR_HEIGHT = 56
/** Visible height of the sheet when peeking: the handle and the top of the card. */
const PEEK_HEIGHT = 200

const card = ref<HTMLElement | null>(null)
const explorer = ref<HTMLElement | null>(null)
const insetProbe = ref<HTMLElement | null>(null)
const sheet = ref<InstanceType<typeof MapAreaSheet> | null>(null)
const sheetSnap = ref<SheetSnap>('peek')

/** The preview keeps its height while its map is out on the full screen, so the page does not jump. */
const cardHeight = ref<number | null>(null)
const explorerHeight = ref(0)
/** The notch and home indicator, in px. */
const insets = ref({ top: 0, bottom: 0 })

const sheetSizes = computed(() =>
  sheetHeights(explorerHeight.value, {
    peek: PEEK_HEIGHT + insets.value.bottom,
    topInset: insets.value.top + BAR_HEIGHT,
  }),
)

function measureExplorer() {
  if (insetProbe.value) {
    const style = getComputedStyle(insetProbe.value)
    insets.value = {
      top: parseFloat(style.paddingTop) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
    }
  }
  explorerHeight.value = explorer.value?.clientHeight ?? 0
}

/** True once the reader has moved the map themselves, so a new sheet height will not undo it. */
let userMoved = false

function onUserMove() {
  userMoved = true
}

const sheetShown = computed(() => props.showAreaList || Boolean(selectedItem.value))

/** What the top bar and the sheet cover of the map; the canvas centres areas in the rest. */
const mapInsets = computed(() => ({
  top: expanded.value ? insets.value.top + BAR_HEIGHT : 0,
  // A full sheet hides the map; frame for the half-height one the reader will fold back to.
  bottom:
    expanded.value && sheetShown.value
      ? sheetSizes.value[sheetSnap.value === 'full' ? 'half' : sheetSnap.value]
      : 0,
}))

/** Centre the selected area in what the top bar and the sheet leave free. */
function frameSelected() {
  const id = selectedAreaId.value
  if (!id || !expanded.value) return

  measureExplorer()
  canvas.value?.zoomToElement(getAreaElement(id))
  userMoved = false
}

/** A frame later, or after 100ms if the browser is not painting (a hidden tab never calls back). */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
    setTimeout(resolve, 100)
  })

function lockPageScroll(locked: boolean) {
  document.documentElement.classList.toggle('overflow-hidden', locked)
  document.documentElement.classList.toggle('overscroll-none', locked)
}

async function openExplorer() {
  if (expanded.value || !compact.value) return
  cardHeight.value = card.value?.offsetHeight ?? null
  openedHere = true
  await router.push({ query: { ...route.query, [EXPLORER_QUERY]: 'open' } })
}

function closeExplorer() {
  if (!expanded.value) return
  if (openedHere) {
    router.back() // our own entry: popping it is what a back swipe does too
    return
  }
  const query = { ...route.query }
  delete query[EXPLORER_QUERY]
  router.replace({ query })
}

function onPreviewClick() {
  if (compact.value && !expanded.value) openExplorer()
}

// Opened by the URL (a reload, or the phone restoring the app) the map arrives after the flag.
watch([explorer, insetProbe], () => expanded.value && measureExplorer(), { flush: 'post' })

watch(
  expanded,
  async (open, wasOpen) => {
    // Only touch the page's scroll lock for the explorer's own open and close: the menu uses it too.
    if (open || wasOpen) lockPageScroll(open)

    if (open) {
      sheetSnap.value = 'peek'
      await nextTick()
      measureExplorer()
      await nextFrame() // let the full-screen layout settle before framing against its size
      frameSelected()
      return
    }
    if (!wasOpen) return

    openedHere = false
    userMoved = false
    selectedAreaId.value = null
    hoveredAreaId.value = null
    applyHighlightState()
    canvas.value?.resetZoom()
  },
  { immediate: true },
)

// A new sheet height frees or covers part of the map: keep the area in view, unless the reader
// has taken the map over.
watch(sheetSnap, async () => {
  if (!expanded.value || !selectedAreaId.value || userMoved) return
  await nextTick()
  frameSelected()
})

useEventListener(window, 'resize', () => {
  if (expanded.value) measureExplorer()
})
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape' && expanded.value) closeExplorer()
})

onBeforeUnmount(() => {
  if (expanded.value) lockPageScroll(false)
})

async function openAreaPanel(svgAreaId: string, source: 'map' | 'list' = 'map') {
  selectedAreaId.value = svgAreaId
  applyHighlightState()

  if (compact.value) {
    if (!expanded.value) {
      await openExplorer() // the watcher frames the area once the map is full screen
      return
    }
    // From the list the reader wants to see where it is; on the map they are already looking.
    sheetSnap.value =
      source === 'list' ? 'peek' : sheetSnap.value === 'full' ? 'half' : sheetSnap.value
    await nextTick()
    sheet.value?.scrollToTop()
    frameSelected()
    return
  }

  // A small appellation is a speck on a whole-region map: bring it into view.
  canvas.value?.zoomToElement(getAreaElement(svgAreaId))
}

function closeAreaPanel() {
  selectedAreaId.value = null
  applyHighlightState()
  canvas.value?.resetZoom()
  userMoved = false
}

function applyMapBindings() {
  if (!mapContainer.value || !currentMap.value) return

  const svg = mapContainer.value.querySelector('svg')
  if (!svg) return

  palette = readPalette()
  mapAspect.value = readMapAspect(svg)

  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${currentMap.value.name} wine map`)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.style.display = 'block'

  for (const area of currentMap.value.areas) {
    const el = getAreaElement(area.svgAreaId)
    if (!el) continue

    if (!isAreaVisible(area)) {
      el.style.display = 'none'
      el.style.pointerEvents = 'none'
      continue
    }
    el.style.display = ''
    el.style.pointerEvents = ''

    const shapes = getShapeElements(el)
    const interactiveArea = isInteractiveArea(area)
    const nonClickableArea = !area.isClickable
    for (const shape of shapes) {
      applyShapeBaseStyles(shape, nonClickableArea)
      applyShapeInteractivity(shape, interactiveArea)
    }

    if (!interactiveArea) {
      el.style.pointerEvents = 'none'
      continue
    }

    if (el.dataset.bound !== 'true') {
      el.dataset.bound = 'true'

      el.addEventListener('mouseenter', () => {
        setHoveredArea(area.svgAreaId)
      })

      el.addEventListener('mouseleave', () => {
        setHoveredArea(null)
      })

      el.addEventListener('click', (event) => {
        // The phone preview opens on a tap anywhere on it; an area handles its own tap.
        event.stopPropagation()
        openAreaPanel(area.svgAreaId)
      })
    }
  }

  applyHighlightState()
}

async function loadMap() {
  const token = ++loadToken
  await wineMapsStore.loadMap(props.mapKey)

  const map = currentMap.value
  if (!map?.svgAssetPath) return

  try {
    const loaded = await loadMapSvg(map, map.svgAssetPath)
    if (token !== loadToken) return // a newer map was requested meanwhile

    overlays.value = loaded.overlays
    visibleKinds.value = loaded.visibleKinds
    svgMarkup.value = loaded.baseMarkup
  } catch (error) {
    console.error('Wine map failed to load', error)
    return
  }

  await nextTick()
  applyMapBindings()
}

onMounted(loadMap)

watch(
  () => props.mapKey,
  async () => {
    selectedAreaId.value = null
    hoveredAreaId.value = null
    svgMarkup.value = ''
    mapAspect.value = null
    overlays.value = []
    visibleKinds.value = []
    await loadMap()
  },
)

watch(
  () => currentMap.value?.areas,
  async () => {
    await nextTick()
    applyMapBindings()
  },
  { deep: true },
)
</script>

<template>
  <!-- Below lg the figure rail above already draws the rule; from lg it stands beside the title. -->
  <section class="lg:border-t lg:border-border lg:pt-5">
    <header class="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div>
        <h2 class="font-heading text-2xl font-semibold text-foreground">Wine Map</h2>
        <p class="text-sm text-muted-foreground">{{ heading }}</p>
      </div>

      <MapLayerToggles
        v-if="overlayToggles.length"
        :toggles="overlayToggles"
        @toggle="toggleOverlay"
      />
    </header>

    <div
      v-if="hasMap && hasSvg"
      :class="showAreaList ? 'grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : 'block'"
    >
      <!-- The stage fills its column; the map inside is capped by height, not by width. On a phone it
           is a preview: tapping it moves the same map out to a full-screen explorer (teleported to
           <body>, so nothing around it can clip or re-position it) and this card holds its place. -->
      <div
        ref="card"
        class="relative flex min-w-0 items-center justify-center rounded-lg border bg-muted/30 p-4 lg:min-h-[440px]"
        :style="expanded && cardHeight ? { height: `${cardHeight}px` } : undefined"
        @click="onPreviewClick"
      >
        <Teleport to="body" :disabled="!expanded">
          <div
            ref="explorer"
            :class="expanded ? 'fixed inset-0 z-[60] overflow-hidden bg-background' : 'contents'"
            :role="expanded ? 'dialog' : undefined"
            :aria-modal="expanded ? 'true' : undefined"
            :aria-label="expanded ? `${currentMap?.name} map` : undefined"
          >
            <WineMapCanvas
              ref="canvas"
              :class="expanded ? 'h-full w-full' : 'w-full'"
              zoomable
              :interaction="interaction"
              :insets="mapInsets"
              :style="expanded ? undefined : canvasStyle"
              :base-markup="svgMarkup"
              :overlays="overlays"
              :visible-kinds="visibleKinds"
              @user-move="onUserMove"
            />

            <template v-if="expanded">
              <!-- Measures the notch and home indicator, which only CSS can see. -->
              <div
                ref="insetProbe"
                aria-hidden="true"
                class="pointer-events-none invisible absolute left-0 top-0 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
              />

              <div
                class="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-3 pt-[calc(env(safe-area-inset-top)+8px)]"
              >
                <button
                  type="button"
                  class="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-sm"
                  aria-label="Close map"
                  @click="closeExplorer"
                >
                  <X class="size-5" aria-hidden="true" />
                </button>
                <MapLayerToggles
                  v-if="overlayToggles.length"
                  class="pointer-events-auto justify-end"
                  floating
                  :toggles="overlayToggles"
                  @toggle="toggleOverlay"
                />
              </div>

              <MapAreaSheet
                v-if="sheetShown"
                ref="sheet"
                v-model:snap="sheetSnap"
                class="z-20"
                :heights="sheetSizes"
                label="Area details"
              >
                <template v-if="selectedItem" #action>
                  <Button variant="ghost" size="sm" @click="closeAreaPanel">← All areas</Button>
                </template>

                <MapAreaDetail
                  v-if="selectedItem"
                  :target="selectedItem.area.target"
                  :name="selectedItem.displayName"
                />
                <MapAreaList
                  v-else
                  :items="areaItems"
                  :active-id="activeAreaId"
                  @hover="setHoveredArea"
                  @select="openAreaPanel($event, 'list')"
                />
              </MapAreaSheet>
            </template>
          </div>
        </Teleport>

        <button
          v-if="compact && !expanded"
          type="button"
          class="absolute bottom-3 right-3 flex min-h-11 items-center gap-2 rounded-full border border-border bg-background/90 px-4 text-sm text-foreground shadow-sm"
          @click.stop="openExplorer"
        >
          <Maximize2 class="size-4" aria-hidden="true" />
          Explore map
        </button>
      </div>

      <!-- On wide screens the panel takes the map's height and scrolls inside it. On a phone it is
           only the list: an area opens in the explorer's sheet. -->
      <aside v-if="showAreaList" class="relative min-w-0 rounded-md border border-border">
        <div class="p-5 lg:absolute lg:inset-0 lg:overflow-y-auto">
          <transition name="region-panel" mode="out-in">
            <div v-if="selectedItem && !compact" :key="`area-${selectedItem.id}`">
              <Button variant="ghost" size="sm" class="-ml-3 mb-2" @click="closeAreaPanel">
                ← All areas
              </Button>
              <MapAreaDetail :target="selectedItem.area.target" :name="selectedItem.displayName" />
            </div>

            <MapAreaList
              v-else
              key="area-list"
              columns
              :items="areaItems"
              :active-id="activeAreaId"
              @hover="setHoveredArea"
              @select="openAreaPanel($event, 'list')"
            />
          </transition>
        </div>
      </aside>
    </div>

    <div v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No map available for {{ mapKey }} yet.
    </div>

    <p v-if="hasMap && hasSvg && creditParts.length" class="mt-2 text-xs text-muted-foreground">
      <template v-for="(part, index) in creditParts" :key="index">
        <a
          v-if="part.href"
          :href="part.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-2 hover:text-foreground"
          >{{ part.text }}</a
        >
        <template v-else>{{ part.text }}</template>
      </template>
    </p>
  </section>
</template>

<style scoped>
.region-panel-enter-active,
.region-panel-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.region-panel-enter-from,
.region-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
