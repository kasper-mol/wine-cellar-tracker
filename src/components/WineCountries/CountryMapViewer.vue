<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { countryMapConfig } from '@/config/countryMapConfig'

const props = withDefaults(
  defineProps<{
    countryName: string
    showRegionList?: boolean
  }>(),
  {
    showRegionList: true,
  },
)

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
}

const mapConfig = computed(() => {
  const normalized = normalizeName(props.countryName)
  if (!normalized) return undefined

  if (countryMapConfig[normalized]) return countryMapConfig[normalized]

  const match = Object.entries(countryMapConfig).find(([key]) => normalizeName(key) === normalized)
  return match?.[1]
})
const hasCountryName = computed(() => Boolean(props.countryName?.trim()))
const mapLayoutClass = computed(() =>
  props.showRegionList ? 'grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : 'block',
)
const mapFrameClass = computed(() =>
  props.showRegionList ? 'w-full max-w-[520px] mx-auto' : 'w-full max-w-[640px] mx-auto',
)
const mapContainer = ref<HTMLElement | null>(null)
const selectedRegionLabel = ref<string | null>(null)
const regionItems = ref<{ label: string; displayName: string }[]>([])
const hoveredRegionLabel = ref<string | null>(null)
const activeRegionLabel = computed(
  () => hoveredRegionLabel.value ?? selectedRegionLabel.value ?? null,
)
const regionLayerMap = new Map<string, Element>()
const selectedRegionDisplayName = computed(() => {
  if (!selectedRegionLabel.value) return ''
  return (
    regionItems.value.find((item) => item.label === selectedRegionLabel.value)?.displayName ??
    toDisplayName(selectedRegionLabel.value)
  )
})

function toDisplayName(value: string) {
  return value
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function setLayerHighlight(label: string, isActive: boolean) {
  const layer = regionLayerMap.get(label)
  if (!layer) return
  const highlightFill = mapConfig.value?.highlight?.fill
  const highlightStroke = mapConfig.value?.highlight?.stroke
  layer.querySelectorAll('path, polygon, rect, circle, ellipse').forEach((shape) => {
    const element = shape as HTMLElement
    element.style.opacity = isActive ? '0.75' : '1'
    element.style.filter = isActive ? 'brightness(1.1)' : 'none'
    if (highlightFill) {
      if (isActive) {
        element.style.fill = highlightFill
      } else if (element.dataset.baseFill !== undefined) {
        element.style.fill = element.dataset.baseFill
      }
    }
    if (highlightStroke) {
      if (isActive) {
        element.style.stroke = highlightStroke
      } else if (element.dataset.baseStroke !== undefined) {
        element.style.stroke = element.dataset.baseStroke
      }
    }
  })
}

function applyHighlightState() {
  regionLayerMap.forEach((_, label) => {
    const isActive = label === activeRegionLabel.value
    setLayerHighlight(label, isActive)
  })
}

function setHoveredRegion(label: string | null) {
  hoveredRegionLabel.value = label
  applyHighlightState()
}

function openRegionPanel(label: string, displayName?: string) {
  selectedRegionLabel.value = label
  applyHighlightState()
  if (displayName && displayName !== selectedRegionDisplayName.value) {
    const index = regionItems.value.findIndex((item) => item.label === label)
    if (index !== -1) {
      regionItems.value[index] = { label, displayName }
    }
  }
}

function closeRegionPanel() {
  selectedRegionLabel.value = null
  applyHighlightState()
}

function applyMapStyles() {
  if (!mapConfig.value || !mapContainer.value) return

  const svg = mapContainer.value.querySelector('svg')
  if (!svg) return

  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', `${props.countryName} wine regions map`)
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.style.width = '100%'
  svg.style.height = 'auto'
  svg.style.display = 'block'

  const borderLayerLabel = mapConfig.value.borderLayer?.label
  if (borderLayerLabel) {
    const borderLayer = svg.querySelector(`g[inkscape\\:label="${borderLayerLabel}"]`)
    if (borderLayer) {
      const borderFill = mapConfig.value.borderLayer?.fill ?? 'transparent'
      const borderStroke = mapConfig.value.borderLayer?.stroke
      borderLayer.querySelectorAll('path, polygon, rect, circle, ellipse').forEach((shape) => {
        const element = shape as HTMLElement
        element.style.fill = borderFill
        if (borderStroke) {
          element.style.stroke = borderStroke
        }
      })
    }
  }

  regionLayerMap.clear()
  const regionLayers = Array.from(svg.querySelectorAll('g[inkscape\\:label]')).filter((layer) => {
    const label = layer.getAttribute('inkscape:label')
    return label && label !== borderLayerLabel
  })

  regionItems.value = regionLayers
    .map((layer) => layer.getAttribute('inkscape:label'))
    .filter((label): label is string => Boolean(label))
    .map((label) => ({
      label,
      displayName: mapConfig.value?.regionNames?.[label] ?? toDisplayName(label),
    }))

  regionLayers.forEach((layer) => {
    const label = layer.getAttribute('inkscape:label')
    if (!label) return

    regionLayerMap.set(label, layer)

    const fill = mapConfig.value?.regionColors?.[label] ?? mapConfig.value?.defaultFill ?? '#e9b3b3'
    layer.querySelectorAll('path, polygon, rect, circle, ellipse').forEach((shape) => {
      const element = shape as HTMLElement
      element.style.fill = fill
      element.dataset.baseFill = fill
      element.dataset.baseStroke = element.style.stroke ?? ''
      element.style.cursor = 'pointer'
      element.style.transition = 'fill 150ms ease, opacity 150ms ease'
    })

    if ((layer as HTMLElement).dataset.bound !== 'true') {
      ;(layer as HTMLElement).dataset.bound = 'true'
      layer.addEventListener('mouseenter', () => {
        setHoveredRegion(label)
      })

      layer.addEventListener('mouseleave', () => {
        setHoveredRegion(null)
      })

      layer.addEventListener('click', () => {
        openRegionPanel(label, mapConfig.value?.regionNames?.[label] ?? toDisplayName(label))
      })
    }
  })

  applyHighlightState()
}

onMounted(async () => {
  await nextTick()
  applyMapStyles()
})

watch(mapConfig, async () => {
  await nextTick()
  applyMapStyles()
})
</script>

<template>
  <div class="rounded-xl border border-border bg-card/40 p-6">
    <div class="mb-4">
      <h2 class="font-serif text-2xl font-semibold text-foreground">Wine Map</h2>
      <p class="text-sm text-muted-foreground">Click a region to view its name.</p>
    </div>

    <div v-if="mapConfig" :class="mapLayoutClass">
      <div ref="mapContainer" class="rounded-lg border bg-muted/30 p-4" :class="mapFrameClass">
        <div v-html="mapConfig.svg"></div>
      </div>

      <div v-if="showRegionList" class="rounded-lg border bg-card/60 p-4">
        <transition name="region-panel" mode="out-in">
          <div v-if="selectedRegionLabel" key="region-detail" class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-muted-foreground">Selected region</p>
                <h3 class="font-serif text-2xl font-semibold text-foreground">
                  {{ selectedRegionDisplayName }}
                </h3>
              </div>
              <Button variant="ghost" size="sm" @click="closeRegionPanel">Close</Button>
            </div>
            <div
              class="rounded-lg border border-dashed border-muted bg-background/70 p-4 text-sm text-muted-foreground"
            >
              Region details will appear here.
            </div>
          </div>

          <div v-else key="region-list">
            <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Regions
            </h3>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="region in regionItems"
                :key="region.label"
                type="button"
                class="rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground transition hover:border-primary/60 hover:text-primary"
                :class="{
                  'border-primary/60 text-primary': activeRegionLabel === region.label,
                }"
                @mouseenter="setHoveredRegion(region.label)"
                @mouseleave="setHoveredRegion(null)"
                @click="openRegionPanel(region.label, region.displayName)"
              >
                {{ region.displayName }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div
      v-else-if="hasCountryName"
      class="rounded-lg border border-dashed border-muted p-6 text-sm text-muted-foreground"
    >
      No map available for {{ countryName }} yet.
    </div>
  </div>

  <div></div>
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
