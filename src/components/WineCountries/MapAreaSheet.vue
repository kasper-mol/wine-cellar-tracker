<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  clampSheetHeight,
  nextSnap,
  settleSheet,
  type SheetHeights,
  type SheetSnap,
} from '@/lib/sheetSnap'

const props = defineProps<{
  /** Visible height of each snap, px. */
  heights: SheetHeights
  label: string
}>()

const snap = defineModel<SheetSnap>('snap', { required: true })

/** A press that moves less than this is a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6

const root = ref<HTMLElement | null>(null)
const scroller = ref<HTMLElement | null>(null)
/** Visible height while a finger is dragging the sheet; null otherwise. */
const dragHeight = ref<number | null>(null)

const visible = computed(() => dragHeight.value ?? props.heights[snap.value])

/** The sheet is always as tall as it can get; sliding it down hides the rest below the screen. */
const style = computed(() => ({
  height: `${props.heights.full}px`,
  transform: `translate3d(0, ${props.heights.full - visible.value}px, 0)`,
}))

interface Drag {
  pointerId: number
  startY: number
  startHeight: number
  samples: { t: number; y: number }[]
  moved: boolean
}

let drag: Drag | null = null
let swallowClick = false

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  // Fully open, the content scrolls; only the handle row drags the sheet then.
  if (snap.value === 'full' && (event.target as Element).closest('[data-sheet-scroll]')) return

  swallowClick = false
  drag = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startHeight: visible.value,
    samples: [{ t: event.timeStamp, y: event.clientY }],
    moved: false,
  }
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return

  const dy = event.clientY - drag.startY
  if (!drag.moved) {
    if (Math.abs(dy) < DRAG_THRESHOLD_PX) return
    drag.moved = true
    try {
      root.value?.setPointerCapture(event.pointerId)
    } catch {
      // Not capturable (the pointer already ended); the drag still follows the events it gets.
    }
  }

  dragHeight.value = clampSheetHeight(drag.startHeight - dy, props.heights)
  drag.samples.push({ t: event.timeStamp, y: event.clientY })
  if (drag.samples.length > 5) drag.samples.shift()
}

function onPointerEnd(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const ended = drag
  drag = null

  if (!ended.moved) return
  swallowClick = true

  const first = ended.samples[0]
  const last = ended.samples[ended.samples.length - 1]
  const elapsed = first && last ? last.t - first.t : 0
  const velocity = first && last && elapsed > 0 ? (first.y - last.y) / elapsed : 0

  const target = settleSheet(dragHeight.value ?? ended.startHeight, velocity, props.heights)
  dragHeight.value = null // the sheet now glides from where the finger left it to the snap
  snap.value = target
}

function onHandleClick() {
  if (swallowClick) {
    swallowClick = false
    return
  }
  snap.value = nextSnap(snap.value)
}

function scrollToTop() {
  scroller.value?.scrollTo({ top: 0 })
}

defineExpose({ scrollToTop })
</script>

<template>
  <section
    ref="root"
    :aria-label="label"
    class="sheet absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-xl border-t border-border bg-background shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.25)]"
    :class="{ 'sheet-glide': dragHeight === null }"
    :style="style"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerEnd"
    @pointercancel="onPointerEnd"
  >
    <!-- The handle row always drags; a tap on the bar opens the sheet a step further. -->
    <div class="relative h-11 shrink-0 touch-none select-none">
      <button
        type="button"
        class="absolute inset-0 flex items-start justify-center pt-2.5"
        :aria-label="snap === 'full' ? 'Make the card smaller' : 'Show more'"
        @click="onHandleClick"
      >
        <span class="h-1 w-10 rounded-full bg-foreground/25" />
      </button>
      <div class="absolute right-2 top-1 z-10">
        <slot name="action" />
      </div>
    </div>

    <div
      ref="scroller"
      data-sheet-scroll
      class="min-h-0 flex-1 overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+24px)]"
      :class="snap === 'full' ? 'touch-pan-y overflow-y-auto' : 'touch-none overflow-hidden'"
    >
      <slot />
    </div>
  </section>
</template>

<style scoped>
.sheet-glide {
  transition: transform 320ms cubic-bezier(0.22, 0.61, 0.36, 1);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-glide {
    transition: none;
  }
}
</style>
