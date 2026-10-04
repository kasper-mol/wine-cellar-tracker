import { computed, ref, watch } from 'vue'
import { WINE_MAP_OVERLAY_KINDS } from '@/content/wineMapLayers'
import { extractSvgLayerElements, sanitizeSvg, splitOverlayLayers } from '@/lib/svgUtils'
import { prepareOverlayMarkup } from '@/lib/wineMapOverlay'
import { toWineMapLayerElementDto } from '@/services/wineMaps'
import { useWineMapsStore } from '@/stores/wineMaps'
import type { WineMapCanvasOverlay, WineMapOverlayKind } from '@/types/wineMaps'

export type WineMapEditMode = 'areas' | WineMapOverlayKind

interface OverlaySource {
  markup: string
  /** Keys that should have a settings row: every element of water, only the names of places. */
  keys: string[]
}

/**
 * State of the manage page's map preview: the map's SVG split into its areas and overlay layers,
 * which layer is being edited, and what is selected. Clicks on the map and rows in the table both
 * end up here.
 */
export function useWineMapOverlayEditor(onError: (error: unknown) => void) {
  const store = useWineMapsStore()

  const mode = ref<WineMapEditMode>('areas')
  const shown = ref<Record<WineMapOverlayKind, boolean>>({ water: true, places: true })

  const selectedKey = ref<string | null>(null)
  /** A dot with no name, selected on the map. */
  const selectedDotKey = ref<string | null>(null)
  /** Row waiting for the next click on a dot. */
  const pickingDotForId = ref<string | null>(null)

  /* ----------------------------- the map's SVG ----------------------------- */

  /** The map's SVG exactly as stored; the page fills it in. */
  const rawSvg = ref('')

  const parsed = computed(() => {
    const overlays: Partial<Record<WineMapOverlayKind, OverlaySource>> = {}
    if (!rawSvg.value) return { baseMarkup: '', overlays, error: null as string | null }

    try {
      const split = splitOverlayLayers(rawSvg.value)
      for (const kind of WINE_MAP_OVERLAY_KINDS) {
        const layerSvg = split.overlays[kind]
        if (!layerSvg) continue

        const { elements } = extractSvgLayerElements(layerSvg)
        overlays[kind] = {
          markup: prepareOverlayMarkup(layerSvg, kind),
          keys: elements
            .filter((element) => kind === 'water' || element.type === 'text')
            .map((element) => element.key),
        }
      }
      return { baseMarkup: sanitizeSvg(split.baseSvg), overlays, error: null }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the SVG'
      return { baseMarkup: '', overlays: {}, error: message }
    }
  })

  const baseMarkup = computed(() => parsed.value.baseMarkup)
  const svgError = computed(() => parsed.value.error)
  /** Overlay layers the SVG actually contains (an Inkscape layer named `water` / `places`). */
  const presentKinds = computed(() =>
    WINE_MAP_OVERLAY_KINDS.filter((kind) => parsed.value.overlays[kind]),
  )

  // Settings rows are created as soon as the SVG shows a layer, so there is nothing to set up.
  watch(
    [() => store.adminMap?.id, presentKinds],
    async ([mapId, kinds]) => {
      if (!mapId) return
      for (const kind of kinds) {
        if (store.adminLayer(kind)) continue
        try {
          await store.ensureLayer(kind)
        } catch (error) {
          onError(error)
        }
      }
    },
    { immediate: true },
  )

  const canvasOverlays = computed<WineMapCanvasOverlay[]>(() =>
    WINE_MAP_OVERLAY_KINDS.flatMap((kind) => {
      const source = parsed.value.overlays[kind]
      const layer = store.adminLayer(kind)
      if (!source || !layer) return []
      return [
        {
          id: layer.id,
          kind,
          markup: source.markup,
          stack: layer.stack,
          opacity: layer.opacity,
          elements: layer.elements.map(toWineMapLayerElementDto),
        },
      ]
    }),
  )

  const visibleKinds = computed(() =>
    canvasOverlays.value.map((overlay) => overlay.kind).filter((kind) => shown.value[kind]),
  )

  /* ----------------------------- selection ----------------------------- */

  const interactiveKind = computed(() => (mode.value === 'areas' ? null : mode.value))
  const activeLayer = computed(() =>
    interactiveKind.value ? store.adminLayer(interactiveKind.value) : null,
  )

  const selectedRow = computed(
    () =>
      activeLayer.value?.elements.find((element) => element.svg_element_id === selectedKey.value) ??
      null,
  )

  const highlightKeys = computed(() =>
    [selectedKey.value, selectedRow.value?.dot_svg_element_id, selectedDotKey.value].filter(
      (key): key is string => Boolean(key),
    ),
  )

  function clearSelection() {
    selectedKey.value = null
    selectedDotKey.value = null
    pickingDotForId.value = null
  }

  function selectKey(key: string | null) {
    selectedKey.value = key
    selectedDotKey.value = null
  }

  async function assignDot(dotKey: string) {
    const layer = activeLayer.value
    const rowId = pickingDotForId.value
    pickingDotForId.value = null
    if (!layer || !rowId) return

    try {
      // A dot belongs to one name, so release it from whichever name has it now.
      const holder = layer.elements.find(
        (element) => element.dot_svg_element_id === dotKey && element.id !== rowId,
      )
      if (holder) await store.saveLayerElement(layer.id, holder.id, { dot_svg_element_id: null })
      await store.saveLayerElement(layer.id, rowId, { dot_svg_element_id: dotKey })
    } catch (error) {
      onError(error)
    }
  }

  function handleElementClick(payload: {
    kind: WineMapOverlayKind
    key: string
    type: 'text' | 'shape'
  }) {
    const layer = activeLayer.value
    if (!layer || payload.kind !== mode.value) return

    if (payload.kind === 'places' && payload.type === 'shape') {
      if (pickingDotForId.value) {
        void assignDot(payload.key)
        return
      }
      const owner = layer.elements.find((element) => element.dot_svg_element_id === payload.key)
      selectedKey.value = owner?.svg_element_id ?? null
      selectedDotKey.value = owner ? null : payload.key
      return
    }

    if (pickingDotForId.value) return // waiting for a dot, not a name
    selectKey(payload.key)
  }

  watch(mode, clearSelection)
  watch(() => store.adminMap?.id, clearSelection)

  return {
    mode,
    shown,
    rawSvg,
    baseMarkup,
    svgError,
    presentKinds,
    canvasOverlays,
    visibleKinds,
    interactiveKind,
    activeLayer,
    activeKeys: computed(() =>
      interactiveKind.value ? (parsed.value.overlays[interactiveKind.value]?.keys ?? null) : null,
    ),
    selectedKey,
    selectedDotKey,
    selectedRow,
    pickingDotForId,
    highlightKeys,
    selectKey,
    clearSelection,
    handleElementClick,
  }
}
