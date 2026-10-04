<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WINE_MAP_OVERLAY_LABELS } from '@/content/wineMapLayers'
import { useFeedback } from '@/composables/useFeedback'
import { useWineMapsStore } from '@/stores/wineMaps'
import type { WineMapOverlayKind } from '@/types/wineMaps'

const props = defineProps<{
  kind: WineMapOverlayKind
  /** What to draw in this layer. */
  description: string
  /** Whether the map's SVG has a layer with this name. */
  present: boolean
}>()

const store = useWineMapsStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()

const layer = computed(() => store.adminLayer(props.kind))
const saving = ref(false)

const settings = reactive({ is_enabled: true, default_visible: true, stack: 10, opacity: 1 })

function resetSettings() {
  settings.is_enabled = layer.value?.is_enabled ?? true
  settings.default_visible = layer.value?.default_visible ?? true
  settings.stack = layer.value?.stack ?? 10
  settings.opacity = layer.value?.opacity ?? 1
}

watch(layer, resetSettings, { immediate: true })

async function save() {
  if (!layer.value) return

  saving.value = true
  clearFeedback()
  try {
    await store.saveLayer(layer.value.id, {
      is_enabled: settings.is_enabled,
      default_visible: settings.default_visible,
      stack: Math.round(Number(settings.stack) || 0),
      opacity: Math.min(1, Math.max(0, Number(settings.opacity))),
    })
    setSuccess('Layer settings saved')
  } catch (error) {
    setError(error, 'Could not save the settings')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4 rounded-md border border-border p-3">
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base font-semibold text-foreground">
          {{ WINE_MAP_OVERLAY_LABELS[kind] }} layer
        </h3>
        <span
          class="rounded px-2 py-0.5 text-xs font-medium"
          :class="present ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'"
        >
          {{ present ? 'Found in the SVG' : 'Not in the SVG' }}
        </span>
      </div>
      <p class="text-sm text-muted-foreground">{{ description }}</p>
    </div>

    <p v-if="!present" class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      The map's SVG has no layer named “{{ kind }}”. Add an Inkscape layer with that name, save as
      Inkscape SVG, upload the new version above and click “Import from SVG”.
    </p>

    <template v-else-if="layer">
      <div class="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.is_enabled" type="checkbox" />
          <span>Show on the public map</span>
        </label>

        <label class="flex items-center gap-2 text-sm">
          <input v-model="settings.default_visible" type="checkbox" />
          <span>Switched on by default</span>
        </label>

        <div class="space-y-1">
          <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >Stack order</label
          >
          <Input v-model="settings.stack" type="number" step="1" class="w-24" />
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >Opacity (0–1)</label
          >
          <Input
            v-model="settings.opacity"
            type="number"
            min="0"
            max="1"
            step="0.05"
            class="w-24"
          />
        </div>

        <Button :disabled="saving" @click="save">
          {{ saving ? 'Saving...' : 'Save settings' }}
        </Button>
      </div>

      <p class="text-sm text-muted-foreground">
        {{ layer.elements.length }} saved {{ layer.elements.length === 1 ? 'row' : 'rows' }}.
      </p>

      <FeedbackBanner :feedback="feedback" />
    </template>
  </div>
</template>
