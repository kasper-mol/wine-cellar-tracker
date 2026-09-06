<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { useWineMapsStore } from '@/stores/wineMaps'

const props = withDefaults(
  defineProps<{
    mapKey: string
    showAreaList?: boolean
  }>(),
  {
    showAreaList: true,
  },
)

const wineMapsStore = useWineMapsStore()

const mapContainer = ref<HTMLElement | null>(null)
const svgMarkup = ref('')

const selectedAreaId = ref<string | null>(null)
const hoveredAreaId = ref<string | null>(null)

const activeAreaId = computed(() => hoveredAreaId.value ?? selectedAreaId.value ?? null)

const currentMap = computed(() => wineMapsStore.currentMap)

const hasMap = computed(() => Boolean(currentMap.value))
const hasSvg = computed(() => Boolean(svgMarkup.value))
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

const selectedAreaDisplayName = computed(() => {
  if (!selectedAreaId.value) return ''
  return (
    areaItems.value.find((item) => item.id === selectedAreaId.value)?.displayName ??
    toDisplayName(selectedAreaId.value)
  )
})

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

async function fetchSvg(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load SVG: ${url}`)
  svgMarkup.value = await response.text()
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

function setAreaHighlight(svgAreaId: string, state: AreaState) {
  const el = getAreaElement(svgAreaId)
  if (!el) return

  const { hoverFill, hoverStroke, selectedFill, selectedStroke } = getPalette()
  const shapes = getShapeElements(el)

  for (const shape of shapes) {
    if (state === 'base') {
      shape.style.fill = shape.dataset.baseFill ?? shape.style.fill
      shape.style.stroke = shape.dataset.baseStroke ?? ''
      shape.style.strokeWidth = BASE_STROKE_WIDTH
      continue
    }

    const selected = state === 'selected'
    shape.style.fill = selected ? selectedFill : hoverFill
    shape.style.stroke = selected ? selectedStroke : hoverStroke
    shape.style.strokeWidth = selected ? SELECTED_STROKE_WIDTH : HOVER_STROKE_WIDTH
  }
}

function resolveAreaState(svgAreaId: string): AreaState {
  if (svgAreaId === hoveredAreaId.value) return 'hover'
  if (svgAreaId === selectedAreaId.value) return 'selected'
  return 'base'
}

function applyHighlightState() {
  for (const area of currentMap.value?.areas ?? []) {
    if (!isAreaVisible(area) || !isInteractiveArea(area)) continue
    setAreaHighlight(area.svgAreaId, resolveAreaState(area.svgAreaId))
  }
}

function setHoveredArea(svgAreaId: string | null) {
  hoveredAreaId.value = svgAreaId
  applyHighlightState()
}

async function openAreaPanel(svgAreaId: string) {
  selectedAreaId.value = svgAreaId
  applyHighlightState()

  // Optional: resolve linked entity here
  // const resolved = await wineMapsStore.resolveArea(svgAreaId)
  // console.log(resolved)
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
  await wineMapsStore.loadMap(props.mapKey)

  if (currentMap.value?.svgAssetPath) {
    await fetchSvg(currentMap.value.svgAssetPath)
    await nextTick()
    applyMapBindings()
  }
}

onMounted(loadMap)

watch(
  () => props.mapKey,
  async () => {
    selectedAreaId.value = null
    hoveredAreaId.value = null
    svgMarkup.value = ''
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
  <div class="border-y border-border py-4">
    <div class="mb-4">
      <h2 class="font-heading text-2xl font-semibold text-foreground">Wine Map</h2>
      <p class="text-sm text-muted-foreground">Click an area to view its name.</p>
    </div>

    <div
      v-if="hasMap && hasSvg"
      :class="showAreaList ? 'grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'block'"
    >
      <div
        ref="mapContainer"
        class="w-full max-w-[520px] mx-auto rounded-lg border bg-muted/30 p-4"
        v-html="svgMarkup"
      />

      <div v-if="showAreaList" class="rounded-md border border-border p-3">
        <transition name="region-panel" mode="out-in">
          <div v-if="selectedAreaId" key="area-detail" class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Selected area</p>
                <h3 class="font-heading text-2xl font-semibold text-foreground">
                  {{ selectedAreaDisplayName }}
                </h3>
              </div>
              <Button variant="ghost" size="sm" @click="closeAreaPanel">Close</Button>
            </div>

            <div class="border-y border-border py-3 text-sm text-foreground/[0.55]">
              Area details will appear here.
            </div>
          </div>

          <div v-else key="area-list">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Areas
            </h3>

            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="item in areaItems"
                :key="item.id"
                type="button"
                class="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition hover:border-primary/60 hover:text-primary"
                :class="{
                  'border-primary/60 text-primary': activeAreaId === item.id,
                }"
                @mouseenter="setHoveredArea(item.id)"
                @mouseleave="setHoveredArea(null)"
                @click="openAreaPanel(item.id)"
              >
                {{ item.displayName }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No map available for {{ mapKey }} yet.
    </div>
  </div>
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
