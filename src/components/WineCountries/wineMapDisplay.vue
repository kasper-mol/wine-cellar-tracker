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
const OWNER_STROKE = '#000000'
const AREA_BASE_FILL = '#c89a7a'
const AREA_STROKE = '#dc2c2c'
const HIGHLIGHT_FILL = '#dc2c2c'
const HIGHLIGHT_STROKE = '#dc2c2c'

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

function resolveBaseFill(shape: HTMLElement) {
  const inlineFill = shape.style.fill?.trim() ?? ''
  const attrFill = shape.getAttribute('fill')?.trim() ?? ''
  const savedFill = shape.dataset.baseFill?.trim() ?? ''
  const candidate = inlineFill || attrFill || savedFill
  if (!candidate || candidate === 'none' || candidate === 'transparent') {
    return AREA_BASE_FILL
  }
  return AREA_BASE_FILL
}

function applyShapeBaseStyles(shape: HTMLElement, nonClickableArea: boolean) {
  const baseFill = nonClickableArea ? NON_CLICKABLE_FILL : resolveBaseFill(shape)
  const baseStroke = nonClickableArea ? OWNER_STROKE : AREA_STROKE

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
  shape.style.strokeWidth = nonClickableArea ? '1.25' : '1.1'
  shape.style.transition = 'fill 150ms ease, opacity 150ms ease, filter 150ms ease'
}

function applyShapeInteractivity(shape: HTMLElement, interactive: boolean) {
  shape.style.cursor = interactive ? 'pointer' : 'default'
  shape.style.pointerEvents = interactive ? 'auto' : 'none'
}

function setAreaHighlight(svgAreaId: string, isActive: boolean) {
  const el = getAreaElement(svgAreaId)
  if (!el) return

  const shapes = getShapeElements(el)
  for (const shape of shapes) {
    shape.style.opacity = isActive ? '0.75' : '1'
    shape.style.filter = isActive ? 'brightness(1.1)' : 'none'

    if (isActive) {
      shape.style.fill = HIGHLIGHT_FILL
      shape.style.stroke = HIGHLIGHT_STROKE
      shape.style.strokeWidth = ''
    } else {
      shape.style.stroke = shape.dataset.baseStroke ?? ''
      shape.style.strokeWidth = ''
      shape.style.fill = shape.dataset.baseFill ?? shape.style.fill
    }
  }
}

function applyHighlightState() {
  for (const area of currentMap.value?.areas ?? []) {
    if (!isAreaVisible(area) || !isInteractiveArea(area)) continue
    setAreaHighlight(area.svgAreaId, area.svgAreaId === activeAreaId.value)
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
  <div class="rounded-xl border border-border bg-card/40 p-6">
    <div class="mb-4">
      <h2 class="font-serif text-2xl font-semibold text-foreground">Wine Map</h2>
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

      <div v-if="showAreaList" class="rounded-lg border bg-card/60 p-4">
        <transition name="region-panel" mode="out-in">
          <div v-if="selectedAreaId" key="area-detail" class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Selected area</p>
                <h3 class="font-serif text-2xl font-semibold text-foreground">
                  {{ selectedAreaDisplayName }}
                </h3>
              </div>
              <Button variant="ghost" size="sm" @click="closeAreaPanel">Close</Button>
            </div>

            <div
              class="rounded-lg border border-dashed border-muted bg-background/70 p-4 text-sm text-muted-foreground"
            >
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

    <div
      v-else
      class="rounded-lg border border-dashed border-muted p-6 text-sm text-muted-foreground"
    >
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
