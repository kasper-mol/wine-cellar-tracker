<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
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
}>()

const emit = defineEmits<{
  'element-click': [payload: { kind: WineMapOverlayKind; key: string; type: 'text' | 'shape' }]
}>()

const root = ref<HTMLElement | null>(null)
const baseContainer = ref<HTMLElement | null>(null)

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
defineExpose({ baseContainer, measure })

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
  <div ref="root" class="grid grid-cols-1">
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
</template>
