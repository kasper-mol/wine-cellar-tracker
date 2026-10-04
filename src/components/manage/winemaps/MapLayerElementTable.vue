<script setup lang="ts">
import { computed, ref } from 'vue'
import { Input } from '@/components/ui/input'
import type { WineMapAdminLayerRecord } from '@/types/wineMaps'

const props = defineProps<{
  layer: WineMapAdminLayerRecord
  selectedKey: string | null
  /** Keys that should have a row, read from the active SVG; null until it has loaded. */
  expectedKeys: string[] | null
}>()

const emit = defineEmits<{ select: [key: string] }>()

const filter = ref('')

const rowKeys = computed(() => new Set(props.layer.elements.map((row) => row.svg_element_id)))
const expected = computed(() => (props.expectedKeys ? new Set(props.expectedKeys) : null))

const unmappedCount = computed(
  () => (props.expectedKeys ?? []).filter((key) => !rowKeys.value.has(key)).length,
)

const rows = computed(() => {
  const needle = filter.value.trim().toLowerCase()
  if (!needle) return props.layer.elements
  return props.layer.elements.filter((row) =>
    [row.svg_element_id, row.display_text, row.subtype]
      .filter(Boolean)
      .some((value) => (value as string).toLowerCase().includes(needle)),
  )
})

const isPlaces = computed(() => props.layer.kind === 'places')

function isMissing(key: string) {
  return expected.value !== null && !expected.value.has(key)
}
</script>

<template>
  <div class="rounded-md border border-border p-3">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-foreground">
          {{ layer.kind === 'water' ? 'Water' : 'Places' }} elements
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ layer.elements.length }} rows.
          <template v-if="unmappedCount">
            {{ unmappedCount }} {{ unmappedCount === 1 ? 'element' : 'elements' }} in the SVG
            {{ unmappedCount === 1 ? 'has' : 'have' }} no row yet: run “Import elements”.
          </template>
        </p>
      </div>
      <Input v-model="filter" placeholder="Filter rows" class="w-48" />
    </div>

    <div
      v-if="!layer.elements.length"
      class="border-y border-border py-3 text-sm text-foreground/[0.55]"
    >
      No rows yet. Upload an SVG for this layer and click “Import elements”.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr class="border-b text-left">
            <th class="px-3 py-2 font-medium">SVG key</th>
            <th class="px-3 py-2 font-medium">Text</th>
            <th class="px-3 py-2 font-medium">Subtype</th>
            <th class="px-3 py-2 font-medium">Size</th>
            <th class="px-3 py-2 font-medium">Shown</th>
            <th v-if="isPlaces" class="px-3 py-2 font-medium">Dot</th>
            <th class="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="cursor-pointer border-b transition hover:bg-muted/30"
            :class="{ 'bg-muted/40': selectedKey === row.svg_element_id }"
            @click="emit('select', row.svg_element_id)"
          >
            <td class="px-3 py-2 font-mono text-xs">{{ row.svg_element_id }}</td>
            <td class="px-3 py-2">{{ row.display_text || '—' }}</td>
            <td class="px-3 py-2">{{ row.subtype || '—' }}</td>
            <td class="px-3 py-2">{{ row.size_class }}</td>
            <td class="px-3 py-2">{{ row.is_visible ? 'Yes' : 'No' }}</td>
            <td v-if="isPlaces" class="px-3 py-2 font-mono text-xs">
              {{ row.dot_svg_element_id || '—' }}
            </td>
            <td class="px-3 py-2">
              <span
                v-if="isMissing(row.svg_element_id)"
                class="rounded bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                >Not in SVG</span
              >
              <span v-else-if="isPlaces && !row.dot_svg_element_id" class="text-muted-foreground"
                >No dot</span
              >
              <span v-else class="text-muted-foreground">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
