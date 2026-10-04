<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WINE_MAP_SIZE_CLASSES, WINE_MAP_SUBTYPES } from '@/content/wineMapLayers'
import { useFeedback } from '@/composables/useFeedback'
import { useWineMapsStore } from '@/stores/wineMaps'
import type {
  WineMapAdminLayerRecord,
  WineMapElementSize,
  WineMapLayerElementRecord,
} from '@/types/wineMaps'

const props = defineProps<{
  layer: WineMapAdminLayerRecord
  row: WineMapLayerElementRecord | null
  /** Key selected on the map or in the table; it may have no row yet. */
  selectedKey: string | null
  /** A dot selected on the map that no name owns. */
  unpairedDotKey: string | null
  /** True while the next click on a dot is meant for this row. */
  picking: boolean
}>()

const emit = defineEmits<{
  'pick-dot': [rowId: string]
  'cancel-pick': []
}>()

const store = useWineMapsStore()
const { feedback, setSuccess, setError, clearFeedback } = useFeedback()
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

const saving = ref(false)
const form = reactive({
  display_text: '',
  subtype: '',
  size_class: 'md' as WineMapElementSize,
  is_visible: true,
})

function resetForm() {
  form.display_text = props.row?.display_text ?? ''
  form.subtype = props.row?.subtype ?? ''
  form.size_class = props.row?.size_class ?? 'md'
  form.is_visible = props.row?.is_visible ?? true
  clearFeedback()
}

watch(() => props.row?.id, resetForm, { immediate: true })

async function save() {
  if (!props.row) return

  saving.value = true
  clearFeedback()
  try {
    await store.saveLayerElement(props.layer.id, props.row.id, {
      display_text: form.display_text.trim() || null,
      subtype: form.subtype || null,
      size_class: form.size_class,
      is_visible: form.is_visible,
    })
    setSuccess('Saved')
  } catch (error) {
    setError(error, 'Could not save')
  } finally {
    saving.value = false
  }
}

async function clearDot() {
  if (!props.row) return
  clearFeedback()
  try {
    await store.saveLayerElement(props.layer.id, props.row.id, { dot_svg_element_id: null })
  } catch (error) {
    setError(error, 'Could not clear the dot')
  }
}

async function remove() {
  if (!props.row) return

  const confirmed = await confirmRef.value?.confirm({
    title: 'Delete row',
    body: `The settings for “${props.row.svg_element_id}” will be removed. It comes back with default settings the next time you import elements, if it is still in the SVG.`,
    confirmLabel: 'Delete',
  })
  if (!confirmed) return

  try {
    await store.removeLayerElement(props.layer.id, props.row.id)
  } catch (error) {
    setError(error, 'Could not delete the row')
  }
}
</script>

<template>
  <div class="rounded-md border border-border p-3">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-foreground">Element editor</h2>
    </div>

    <div v-if="row" class="space-y-4">
      <div class="space-y-1">
        <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >SVG key</label
        >
        <div class="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">
          {{ row.svg_element_id }}
        </div>
      </div>

      <div class="space-y-1">
        <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >Text shown on the map</label
        >
        <Input v-model="form.display_text" placeholder="Same as in the SVG" />
        <p class="text-xs text-muted-foreground">Leave empty to use the text drawn in the SVG.</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >Subtype</label
          >
          <select
            v-model="form.subtype"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">None</option>
            <option
              v-for="subtype in WINE_MAP_SUBTYPES[layer.kind]"
              :key="subtype"
              :value="subtype"
            >
              {{ subtype }}
            </option>
          </select>
        </div>

        <div class="space-y-1">
          <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >Size</label
          >
          <select
            v-model="form.size_class"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option v-for="size in WINE_MAP_SIZE_CLASSES" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
        </div>
      </div>

      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.is_visible" type="checkbox" />
        <span>Shown on the map</span>
      </label>

      <div v-if="layer.kind === 'places'" class="space-y-1">
        <label class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dot</label>
        <div class="flex flex-wrap items-center gap-2">
          <span class="rounded-md border bg-muted/30 px-3 py-2 font-mono text-sm">
            {{ row.dot_svg_element_id || 'No dot paired' }}
          </span>
          <Button v-if="!picking" variant="outline" size="sm" @click="emit('pick-dot', row.id)">
            Pick dot on map
          </Button>
          <Button v-else variant="outline" size="sm" @click="emit('cancel-pick')">Cancel</Button>
          <Button v-if="row.dot_svg_element_id" variant="ghost" size="sm" @click="clearDot">
            Clear dot
          </Button>
        </div>
        <p v-if="picking" class="text-xs text-primary">Click the dot for this place on the map.</p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <Button :disabled="saving" @click="save">{{
          saving ? 'Saving...' : 'Save element'
        }}</Button>
        <Button variant="ghost" class="text-destructive hover:text-destructive" @click="remove">
          Delete row
        </Button>
      </div>

      <FeedbackBanner :feedback="feedback" />
    </div>

    <div v-else-if="unpairedDotKey" class="space-y-1 text-sm text-foreground/[0.7]">
      <p>
        The dot <span class="font-mono">{{ unpairedDotKey }}</span> has no name yet.
      </p>
      <p class="text-foreground/[0.55]">
        Select its name, then use “Pick dot on map”, or run “Auto-pair dots” below.
      </p>
    </div>

    <div v-else-if="selectedKey" class="space-y-1 text-sm text-foreground/[0.7]">
      <p>
        <span class="font-mono">{{ selectedKey }}</span> has no settings row yet.
      </p>
      <p class="text-foreground/[0.55]">Run “Import elements” for this layer to create it.</p>
    </div>

    <div v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      Click an element in the preview or a row in the table.
    </div>

    <FeedbackBanner v-if="!row" :feedback="feedback" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
