<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import MapAreaDetail from '@/components/WineCountries/MapAreaDetail.vue'
import WineMapCanvas from '@/components/WineCountries/WineMapCanvas.vue'
import {
  WINE_MAP_OVERLAY_DEFAULT_STACK,
  WINE_MAP_OVERLAY_KINDS,
  WINE_MAP_OVERLAY_LABELS,
} from '@/content/wineMapLayers'
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
const panel = ref<HTMLElement | null>(null)
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

const BASE_STROKE_WIDTH = '1'
const INERT_STROKE_WIDTH = '0.75'
const HOVER_STROKE_WIDTH = '1.4'
const SELECTED_STROKE_WIDTH = '1.75'

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
  hoveredAreaId.value = svgAreaId
  applyHighlightState()
}

const WIDE_QUERY = '(min-width: 1024px)'

async function openAreaPanel(svgAreaId: string) {
  selectedAreaId.value = svgAreaId
  applyHighlightState()

  // Stacked layout: the panel sits below the map, so a tap on the map would otherwise show nothing.
  if (window.matchMedia(WIDE_QUERY).matches) return
  await nextTick()
  panel.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

function closeAreaPanel() {
  selectedAreaId.value = null
  applyHighlightState()
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

      el.addEventListener('click', () => {
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
        <p class="text-sm text-muted-foreground">{{ hint }}</p>
      </div>

      <div
        v-if="overlayToggles.length"
        role="group"
        aria-label="Map layers"
        class="flex flex-wrap gap-2"
      >
        <button
          v-for="toggle in overlayToggles"
          :key="toggle.kind"
          type="button"
          :aria-pressed="toggle.active"
          class="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition hover:border-primary/60 hover:text-primary"
          :class="{ 'border-primary/60 text-primary': toggle.active }"
          @click="toggleOverlay(toggle.kind)"
        >
          {{ toggle.label }}
        </button>
      </div>
    </header>

    <div
      v-if="hasMap && hasSvg"
      :class="showAreaList ? 'grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]' : 'block'"
    >
      <!-- The stage fills its column; the map inside is capped by height, not by width. -->
      <div
        class="flex min-w-0 items-center justify-center rounded-lg border bg-muted/30 p-4 lg:min-h-[440px]"
      >
        <WineMapCanvas
          ref="canvas"
          class="w-full"
          :style="canvasStyle"
          :base-markup="svgMarkup"
          :overlays="overlays"
          :visible-kinds="visibleKinds"
        />
      </div>

      <!-- On wide screens the panel takes the map's height and scrolls inside it. -->
      <aside
        v-if="showAreaList"
        ref="panel"
        class="relative min-w-0 scroll-mt-4 rounded-md border border-border"
      >
        <div class="p-5 lg:absolute lg:inset-0 lg:overflow-y-auto">
          <transition name="region-panel" mode="out-in">
            <div v-if="selectedItem" :key="`area-${selectedItem.id}`">
              <Button variant="ghost" size="sm" class="-ml-3 mb-2" @click="closeAreaPanel">
                ← All areas
              </Button>
              <MapAreaDetail :target="selectedItem.area.target" :name="selectedItem.displayName" />
            </div>

            <div v-else key="area-list">
              <p class="text-[11px] uppercase tracking-[0.18em] text-accent-700">
                Areas &nbsp;·&nbsp; {{ areaItems.length }}
              </p>

              <ul class="m-0 mt-2 list-none p-0 sm:columns-2 sm:gap-x-6">
                <li v-for="item in areaItems" :key="item.id" class="break-inside-avoid">
                  <button
                    type="button"
                    class="group flex w-full items-baseline justify-between gap-2 border-b border-border py-2 text-left font-heading text-[19px] leading-tight transition-colors hover:text-accent-700"
                    :class="{ 'text-accent-700': activeAreaId === item.id }"
                    @mouseenter="setHoveredArea(item.id)"
                    @mouseleave="setHoveredArea(null)"
                    @focus="setHoveredArea(item.id)"
                    @blur="setHoveredArea(null)"
                    @click="openAreaPanel(item.id)"
                  >
                    <span>{{ item.displayName }}</span>
                    <span
                      aria-hidden="true"
                      class="font-body text-xs text-foreground/30 transition-colors group-hover:text-accent-700"
                    >
                      →
                    </span>
                  </button>
                </li>
              </ul>
            </div>
          </transition>
        </div>
      </aside>
    </div>

    <div v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No map available for {{ mapKey }} yet.
    </div>
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
