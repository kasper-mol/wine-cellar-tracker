<script setup lang="ts">
import { Maximize, Minus, Plus } from 'lucide-vue-next'
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import {
  FULL_WINDOW,
  IDENTITY_VIEW,
  MAX_ZOOM,
  NO_MARGIN,
  clampView,
  isDefaultView,
  isZoomed,
  viewFocusing,
  viewGestured,
  viewLabelScale,
  viewOutlineScale,
  viewPanned,
  viewTransform,
  viewZoomedAt,
  type MapMargin,
  type MapView,
  type MapWindow,
} from '@/lib/mapZoom'
import { collectLayerNodes } from '@/lib/svgUtils'
import {
  measureOverlayGeometry,
  overlayIdPrefix,
  styleOverlay,
  type OverlayGeometry,
} from '@/lib/wineMapOverlay'
import type { WineMapCanvasOverlay, WineMapOverlayKind } from '@/types/wineMaps'

const props = defineProps<{
  baseMarkup: string
  overlays: WineMapCanvasOverlay[]
  visibleKinds: WineMapOverlayKind[]
  /** Manage portal: the overlay that takes clicks (and covers the base map while it does). */
  interactiveKind?: WineMapOverlayKind | null
  /** Manage portal: keys highlighted in the interactive overlay. */
  selectedKeys?: string[]
  /** Public map: zoom state, `zoomToElement`, and zoom-aware label sizes. */
  zoomable?: boolean
  /**
   * Who drives a zoomable map. `pointer` (default): a mouse, with buttons, drag once zoomed and
   * Ctrl/⌘ + scroll. `touch`: the full-screen phone map, which fills its box; one finger pans, two
   * pinch. `none`: a still picture, like the phone's inline preview.
   */
  interaction?: 'pointer' | 'touch' | 'none'
  /**
   * Full-screen map: px at the top and bottom that chrome (the top bar, the sheet) covers. Areas are
   * centred in what is left, and the map can be pulled clear of both strips.
   */
  insets?: { top: number; bottom: number }
}>()

const emit = defineEmits<{
  'element-click': [payload: { kind: WineMapOverlayKind; key: string; type: 'text' | 'shape' }]
  /** The reader moved or zoomed the map themselves, so it should not be re-framed under them. */
  'user-move': []
}>()

/** Buttons zoom by this factor per press. */
const BUTTON_ZOOM_STEP = 1.6
/** Scroll-wheel zoom: a notch of a mouse wheel is about ±100, a trackpad pinch a few units. */
const WHEEL_ZOOM_RATE = 0.003
/** A press that moves less than this many pixels is a click, not a pan; fingers jitter more. */
const DRAG_THRESHOLD_PX = { mouse: 4, touch: 8 }

const mode = computed(() => props.interaction ?? 'pointer')
const touchMode = computed(() => mode.value === 'touch')

const root = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const baseContainer = ref<HTMLElement | null>(null)

const view = shallowRef<MapView>(IDENTITY_VIEW)
/** What the label and border sizes follow; held still during a pinch so it stays smooth. */
const labelView = shallowRef<MapView>(IDENTITY_VIEW)
let labelsFrozen = false
/** Glide between views, but follow the fingers exactly while panning or pinching. */
const animate = ref(true)
const panning = ref(false)

const stageStyle = computed(() => ({
  transform: viewTransform(view.value),
  transformOrigin: '0 0',
  // Read by the overlays (see `zoomAware` in styleOverlay) and the area borders; the stage glides
  // them along with the transform.
  '--map-label-scale': props.zoomable ? String(viewLabelScale(labelView.value)) : undefined,
  '--map-outline-scale': props.zoomable ? String(viewOutlineScale(labelView.value)) : undefined,
}))

/** `insets` as shares of the viewport's height, which is what the zoom maths works in. */
function margin(): MapMargin {
  const height = viewport.value?.getBoundingClientRect().height
  if (!height || !props.insets) return NO_MARGIN
  return { top: props.insets.top / height, bottom: props.insets.bottom / height }
}

function setView(next: MapView, glide = true) {
  animate.value = glide
  view.value = next
  if (!labelsFrozen) labelView.value = next
}

// A sheet that gets shorter lowers the limit the map was pulled to: bring it back inside.
watch(
  () => props.insets,
  () => setView(clampView(view.value, margin())),
  { deep: true },
)

function resetZoom() {
  setView(IDENTITY_VIEW)
}

/** The "show the whole map" button: the reader's own move, unlike the page's `resetZoom`. */
function fitToView() {
  emit('user-move')
  resetZoom()
}

/**
 * Frame an element of the base map: centred in what the insets leave free, as large as the zoom
 * limits allow. Its box is read from the screen and compared with the (equally scaled) stage, so
 * it holds mid-glide too.
 */
function zoomToElement(el: Element | null) {
  const stageBox = stage.value?.getBoundingClientRect()
  if (!el || !stageBox?.width || !stageBox.height) return

  const box = el.getBoundingClientRect()
  if (!box.width && !box.height) return // not drawn

  const edges = margin()
  const free: MapWindow = {
    ...FULL_WINDOW,
    top: edges.top,
    height: Math.max(0, 1 - edges.top - edges.bottom),
  }

  setView(
    viewFocusing(
      {
        left: (box.left - stageBox.left) / stageBox.width,
        top: (box.top - stageBox.top) / stageBox.height,
        width: box.width / stageBox.width,
        height: box.height / stageBox.height,
      },
      free,
      edges,
    ),
  )
}

function zoomBy(factor: number, anchor?: { x: number; y: number }, glide = true) {
  emit('user-move')
  setView(viewZoomedAt(view.value, factor, anchor, margin()), glide)
}

function onWheel(event: WheelEvent) {
  if (mode.value !== 'pointer' || !(event.ctrlKey || event.metaKey) || !viewport.value) return
  event.preventDefault() // a pinch must not zoom the whole page

  const rect = viewport.value.getBoundingClientRect()
  zoomBy(
    Math.exp(-event.deltaY * WHEEL_ZOOM_RATE),
    { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height },
    false,
  )
}

interface Point {
  x: number
  y: number
}

type Gesture =
  | { kind: 'pan'; id: number; origin: Point; from: MapView; moved: boolean }
  | { kind: 'pinch'; ids: [number, number]; distance: number; mid: Point; from: MapView }

const pointers = new Map<number, Point>()
let gesture: Gesture | null = null
let swallowClick = false
/** Anything beyond a plain tap happened since the first finger went down. */
let beyondTap = false

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
const distance = (a: Point, b: Point) => Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))

/** A mouse pans only once zoomed (until then a drag has nothing to move); touch always pans. */
function canPan() {
  return touchMode.value || (mode.value === 'pointer' && isZoomed(view.value))
}

function capture(pointerId: number) {
  try {
    viewport.value?.setPointerCapture(pointerId)
  } catch {
    // A pointer that has already ended cannot be captured; the gesture still works without.
  }
}

function beginPan(id: number, origin: Point, moved = false) {
  // A copy: `origin` must stay where the finger went down while the tracked position moves on.
  gesture = { kind: 'pan', id, origin: { ...origin }, from: view.value, moved }
}

function beginPinch() {
  const [first, second] = [...pointers.entries()]
  if (!first || !second) return

  gesture = {
    kind: 'pinch',
    ids: [first[0], second[0]],
    distance: distance(first[1], second[1]),
    mid: midpoint(first[1], second[1]),
    from: view.value,
  }
  beyondTap = true
  labelsFrozen = true
  panning.value = true
  capture(first[0])
  capture(second[0])
  emit('user-move')
}

function onPointerDown(event: PointerEvent) {
  if (!props.zoomable || mode.value === 'none') return
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (pointers.size >= 2) return // a third finger is ignored

  if (pointers.size === 0) {
    swallowClick = false
    beyondTap = false
  }
  const at = { x: event.clientX, y: event.clientY }
  pointers.set(event.pointerId, at)

  if (pointers.size === 2 && touchMode.value) beginPinch()
  else if (pointers.size === 1 && canPan()) beginPan(event.pointerId, at)
}

function onPointerMove(event: PointerEvent) {
  const known = pointers.get(event.pointerId)
  if (!known || !gesture || !viewport.value) return
  known.x = event.clientX
  known.y = event.clientY
  const rect = viewport.value.getBoundingClientRect()

  if (gesture.kind === 'pinch') {
    const first = pointers.get(gesture.ids[0])
    const second = pointers.get(gesture.ids[1])
    if (!first || !second) return

    const mid = midpoint(first, second)
    setView(
      viewGestured(
        gesture.from,
        {
          scale: distance(first, second) / gesture.distance,
          anchor: {
            x: (gesture.mid.x - rect.left) / rect.width,
            y: (gesture.mid.y - rect.top) / rect.height,
          },
          dx: (mid.x - gesture.mid.x) / rect.width,
          dy: (mid.y - gesture.mid.y) / rect.height,
        },
        margin(),
      ),
      false,
    )
    return
  }

  if (event.pointerId !== gesture.id) return
  const dx = event.clientX - gesture.origin.x
  const dy = event.clientY - gesture.origin.y
  if (!gesture.moved) {
    const limit = event.pointerType === 'mouse' ? DRAG_THRESHOLD_PX.mouse : DRAG_THRESHOLD_PX.touch
    if (Math.hypot(dx, dy) < limit) return
    gesture.moved = true
    beyondTap = true
    panning.value = true
    // Captured only once it is a pan, so a plain click still reaches the area under it.
    capture(event.pointerId)
    emit('user-move')
  }
  setView(viewPanned(gesture.from, dx / rect.width, dy / rect.height, margin()), false)
}

function onPointerEnd(event: PointerEvent) {
  if (!pointers.delete(event.pointerId)) return

  if (gesture?.kind === 'pinch' && gesture.ids.includes(event.pointerId)) {
    // One finger left on the glass carries on as a pan from where the map now is.
    const [rest] = [...pointers.entries()]
    if (rest) beginPan(rest[0], { ...rest[1] }, true)
    else gesture = null
  } else if (gesture?.kind === 'pan' && gesture.id === event.pointerId) {
    gesture = null
  }

  if (pointers.size > 0) return
  gesture = null
  swallowClick = beyondTap
  panning.value = false
  if (labelsFrozen) {
    // Let the labels glide to the size the new zoom calls for.
    labelsFrozen = false
    animate.value = true
    labelView.value = view.value
  }
}

/** The click that ends a pan or pinch must not select the area it happens to end on. */
function onClickCapture(event: MouseEvent) {
  if (!swallowClick) return
  swallowClick = false
  event.stopPropagation()
  event.preventDefault()
}

function overlayContainer(kind: WineMapOverlayKind) {
  return root.value?.querySelector<HTMLElement>(`[data-overlay-kind="${kind}"]`) ?? null
}

/** Positions of the dots and names in an overlay; null while it is hidden or not loaded. */
function measure(kind: WineMapOverlayKind): OverlayGeometry | null {
  const container = overlayContainer(kind)
  return container ? measureOverlayGeometry(container, kind) : null
}

/**
 * The base SVG sits in its own container and each overlay in another, stacked in one grid cell.
 * Keeping them apart means the base map's id lookups never see an overlay's elements.
 */
defineExpose({ baseContainer, measure, zoomToElement, resetZoom })

function styleOverlays() {
  if (!root.value) return
  for (const overlay of props.overlays) {
    const container = root.value.querySelector<HTMLElement>(`[data-overlay-id="${overlay.id}"]`)
    if (!container) continue

    const interactive = overlay.kind === props.interactiveKind
    styleOverlay(container, {
      kind: overlay.kind,
      elements: overlay.elements,
      selectedKeys: interactive ? new Set(props.selectedKeys ?? []) : undefined,
      hitAreas: interactive,
      zoomAware: props.zoomable,
    })
  }
}

function onOverlayClick(event: MouseEvent, overlay: WineMapCanvasOverlay) {
  if (overlay.kind !== props.interactiveKind) return

  const svg = (event.currentTarget as HTMLElement).querySelector('svg')
  const target = event.target as Element | null
  if (!svg || !target) return

  const hitKey = target.closest('[data-ov-hit-for]')?.getAttribute('data-ov-hit-for')
  const node = collectLayerNodes(svg, overlayIdPrefix(overlay.kind)).find((candidate) =>
    hitKey ? candidate.key === hitKey : candidate.el === target || candidate.el.contains(target),
  )
  if (node) emit('element-click', { kind: overlay.kind, key: node.key, type: node.type })
}

onMounted(styleOverlays)

watch(
  [() => props.overlays, () => props.interactiveKind, () => props.selectedKeys],
  async () => {
    await nextTick()
    styleOverlays()
  },
  { deep: true },
)
</script>

<template>
  <div ref="root" class="relative">
    <!-- The viewport clips; the stage inside it is what scales and moves, all layers together.
         `overflow-clip`, not `hidden`: a hidden box can still be scrolled by focus or scrollIntoView,
         which would shift the map off its zoom. -->
    <div
      ref="viewport"
      :class="
        zoomable && [
          'overflow-clip',
          touchMode ? 'h-full touch-none select-none [-webkit-touch-callout:none]' : 'rounded-md',
          // Zoomed, the map is cut off at its edge: a hairline makes that edge look intended.
          mode === 'pointer' &&
            isZoomed(view) && [
              'ring-1 ring-border touch-none',
              panning ? 'cursor-grabbing' : 'cursor-grab',
            ],
        ]
      "
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @click.capture="onClickCapture"
      @wheel="onWheel"
    >
      <!-- Full screen: the stage is the whole screen and each SVG letterboxes its map inside it. -->
      <div
        ref="stage"
        class="isolate grid grid-cols-1"
        :class="[
          animate && 'map-stage-glide',
          panning && 'will-change-transform',
          touchMode && 'h-full grid-rows-1 [&_svg]:!h-full',
        ]"
        :style="stageStyle"
      >
        <div ref="baseContainer" class="col-start-1 row-start-1" v-html="baseMarkup" />

        <div
          v-for="overlay in overlays"
          v-show="visibleKinds.includes(overlay.kind)"
          :key="overlay.id"
          :data-overlay-id="overlay.id"
          :data-overlay-kind="overlay.kind"
          class="col-start-1 row-start-1"
          :class="overlay.kind === interactiveKind ? 'cursor-pointer' : 'pointer-events-none'"
          :style="{ zIndex: overlay.stack, opacity: overlay.opacity }"
          :aria-hidden="overlay.kind === interactiveKind ? undefined : 'true'"
          @click="onOverlayClick($event, overlay)"
          v-html="overlay.markup"
        />
      </div>
    </div>

    <div
      v-if="zoomable && mode !== 'none'"
      role="group"
      aria-label="Map zoom"
      class="absolute z-10 flex flex-col gap-1"
      :class="
        touchMode ? 'right-3 top-[calc(env(safe-area-inset-top)+72px)] gap-2' : 'right-2 top-2'
      "
    >
      <button
        type="button"
        class="zoom-button"
        :class="touchMode && 'zoom-button-touch'"
        aria-label="Zoom in"
        title="Zoom in (Ctrl/⌘ + scroll)"
        :disabled="view.k >= MAX_ZOOM"
        @click="zoomBy(BUTTON_ZOOM_STEP)"
      >
        <Plus class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="zoom-button"
        :class="touchMode && 'zoom-button-touch'"
        aria-label="Zoom out"
        title="Zoom out"
        :disabled="!isZoomed(view)"
        @click="zoomBy(1 / BUTTON_ZOOM_STEP)"
      >
        <Minus class="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="zoom-button"
        :class="touchMode && 'zoom-button-touch'"
        aria-label="Show the whole map"
        title="Show the whole map"
        :disabled="isDefaultView(view)"
        @click="fitToView"
      >
        <Maximize class="size-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style>
/* Registered so the scales can animate along with the stage's transform. */
@property --map-label-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}

@property --map-outline-scale {
  syntax: '<number>';
  inherits: true;
  initial-value: 1;
}
</style>

<style scoped>
.map-stage-glide {
  transition:
    transform 500ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --map-label-scale 500ms cubic-bezier(0.22, 0.61, 0.36, 1),
    --map-outline-scale 500ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .map-stage-glide {
    transition: none;
  }
}

.zoom-button {
  @apply flex size-8 items-center justify-center rounded-md border border-border bg-background/90 text-foreground shadow-sm transition hover:border-primary/60 hover:text-primary disabled:pointer-events-none disabled:opacity-40;
}

/* After `.zoom-button`, so the bigger touch target wins. */
.zoom-button-touch {
  @apply size-11;
}
</style>
