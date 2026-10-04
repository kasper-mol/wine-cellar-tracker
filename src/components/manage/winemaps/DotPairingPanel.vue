<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { Button } from '@/components/ui/button'
import { WINE_MAP_PAIRING_MAX_DISTANCE_RATIO } from '@/content/wineMapLayers'
import { useFeedback } from '@/composables/useFeedback'
import { pairDotsWithTexts } from '@/lib/svgPlacePairing'
import type { OverlayGeometry } from '@/lib/wineMapOverlay'
import { useWineMapsStore } from '@/stores/wineMaps'
import type { WineMapAdminLayerRecord, WineMapDotPair } from '@/types/wineMaps'

const props = defineProps<{
  layer: WineMapAdminLayerRecord
  /** Measures the dots and names in the rendered preview; null while the layer is hidden. */
  measure: () => OverlayGeometry | null
}>()

const store = useWineMapsStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)
const applying = ref(false)

interface Proposal {
  /** New pairs only; pairs that already exist are kept. */
  pairs: WineMapDotPair[]
  unpairedTexts: string[]
  unpairedDots: string[]
  textsWithoutRow: number
}

const proposal = ref<Proposal | null>(null)

const existingPairs = computed<WineMapDotPair[]>(() =>
  props.layer.elements.flatMap((row) =>
    row.dot_svg_element_id
      ? [{ textElementId: row.svg_element_id, dotElementId: row.dot_svg_element_id }]
      : [],
  ),
)

const pairedCount = computed(() => existingPairs.value.length)
const previewPairs = computed(() => proposal.value?.pairs.slice(0, 10) ?? [])

// A proposal describes the rows as they were when it was made.
watch(
  () => props.layer.elements,
  () => {
    proposal.value = null
  },
)

function labelFor(textKey: string) {
  const row = props.layer.elements.find((element) => element.svg_element_id === textKey)
  return row?.display_text || textKey
}

function propose() {
  clearFeedback()
  proposal.value = null

  const geometry = props.measure()
  if (!geometry) {
    setError(
      new Error('The places layer is hidden or not loaded. Show it in the preview and try again.'),
    )
    return
  }

  const rowsByKey = new Map(props.layer.elements.map((row) => [row.svg_element_id, row]))
  const takenDots = new Set(existingPairs.value.map((pair) => pair.dotElementId))

  const texts = geometry.texts.filter((text) => {
    const row = rowsByKey.get(text.id)
    return row && !row.dot_svg_element_id
  })
  const dots = geometry.dots.filter((dot) => !takenDots.has(dot.id))

  const result = pairDotsWithTexts(
    dots,
    texts,
    geometry.viewBoxWidth * WINE_MAP_PAIRING_MAX_DISTANCE_RATIO,
  )

  proposal.value = {
    pairs: result.pairs,
    unpairedTexts: result.unpairedTextIds,
    unpairedDots: result.unpairedDotIds,
    textsWithoutRow: geometry.texts.filter((text) => !rowsByKey.has(text.id)).length,
  }
}

async function apply() {
  if (!proposal.value) return

  applying.value = true
  clearFeedback()
  try {
    const count = proposal.value.pairs.length
    await store.applyDotPairs(props.layer.id, [...existingPairs.value, ...proposal.value.pairs])
    proposal.value = null
    setSuccess(`Paired ${count} ${count === 1 ? 'dot' : 'dots'}`)
  } catch (error) {
    setError(error, 'Could not save the pairs. Run auto-pair again.')
  } finally {
    applying.value = false
  }
}

async function clearAll() {
  const confirmed = await confirmRef.value?.confirm({
    title: 'Clear all pairs',
    body: 'Every name loses its dot. Dots stay on the map but no longer follow their name’s visibility or size.',
    confirmLabel: 'Clear',
  })
  if (!confirmed) return

  clearFeedback()
  try {
    await store.applyDotPairs(props.layer.id, [])
    proposal.value = null
    setSuccess('Pairs cleared')
  } catch (error) {
    setError(error, 'Could not clear the pairs')
  }
}
</script>

<template>
  <div class="space-y-3 rounded-md border border-border p-3">
    <div>
      <h2 class="text-lg font-semibold text-foreground">Dots and names</h2>
      <p class="text-sm text-muted-foreground">
        A place is a name plus its dot. Auto-pair matches each unpaired name with the nearest dot;
        pairs you already made are kept. {{ pairedCount }} of {{ layer.elements.length }} names have
        a dot.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" @click="propose">Auto-pair dots</Button>
      <Button
        v-if="pairedCount"
        variant="ghost"
        class="text-destructive hover:text-destructive"
        @click="clearAll"
      >
        Clear all pairs
      </Button>
    </div>

    <div v-if="proposal" class="space-y-3 border-l-2 border-primary pl-3 text-sm">
      <p>
        <span class="font-medium">{{ proposal.pairs.length }}</span>
        new {{ proposal.pairs.length === 1 ? 'pair' : 'pairs' }} found.
      </p>

      <ul v-if="previewPairs.length" class="space-y-0.5 text-[13px] text-muted-foreground">
        <li v-for="pair in previewPairs" :key="pair.textElementId">
          {{ labelFor(pair.textElementId) }}
          <span class="font-mono text-xs">→ {{ pair.dotElementId }}</span>
        </li>
        <li v-if="proposal.pairs.length > previewPairs.length">
          and {{ proposal.pairs.length - previewPairs.length }} more
        </li>
      </ul>

      <p v-if="proposal.unpairedTexts.length" class="text-[13px] text-muted-foreground">
        No dot close enough for: {{ proposal.unpairedTexts.map(labelFor).join(', ') }}. Use “Pick
        dot on map” for these.
      </p>
      <p v-if="proposal.unpairedDots.length" class="text-[13px] text-muted-foreground">
        {{ proposal.unpairedDots.length }}
        {{ proposal.unpairedDots.length === 1 ? 'dot has' : 'dots have' }} no name nearby.
      </p>
      <p v-if="proposal.textsWithoutRow" class="text-[13px] text-muted-foreground">
        {{ proposal.textsWithoutRow }}
        {{ proposal.textsWithoutRow === 1 ? 'name has' : 'names have' }} no row yet and
        {{ proposal.textsWithoutRow === 1 ? 'was' : 'were' }} skipped: run “Import elements”.
      </p>

      <div class="flex gap-3">
        <Button :disabled="applying || !proposal.pairs.length" @click="apply">
          {{ applying ? 'Saving...' : 'Apply pairs' }}
        </Button>
        <Button variant="ghost" @click="proposal = null">Discard</Button>
      </div>
    </div>

    <FeedbackBanner :feedback="feedback" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
