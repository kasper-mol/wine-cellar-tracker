<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { clusterLabel, flavorLevelCopy } from '@/content/flavorLevels'
import { WINE_STYLE_TOKENS } from '@/lib/appellationCopyForm'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useAppellationFlavorsStore } from '@/stores/appellationFlavors'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import type { FlavorDescriptorRecord } from '@/types/flavorDescriptors'
import type { WineStyle } from '@/types/wineAppellations'

const props = defineProps<{
  appellationId: string | null
  /** Styles the appellation makes; the picker offers these first. */
  wineStyles?: WineStyle[] | null
}>()

const appellationFlavorsStore = useAppellationFlavorsStore()
const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { lexicon, clusters } = storeToRefs(flavorDescriptorsStore)

const style = ref<WineStyle>('red')
const feedback = ref<string | null>(null)
const busy = ref<Set<string>>(new Set())

const styleOptions = computed(() => {
  const own = props.wineStyles ?? []
  return [...own, ...WINE_STYLE_TOKENS.filter((token) => !own.includes(token))]
})

watch(
  () => props.appellationId,
  (id) => {
    if (!id) return
    void appellationFlavorsStore.fetchForAppellation(id)
    if (!clusters.value.length) void flavorDescriptorsStore.loadAll()
    style.value = props.wineStyles?.[0] ?? 'red'
  },
  { immediate: true },
)

const rows = computed(() =>
  props.appellationId ? appellationFlavorsStore.forAppellation(props.appellationId) : [],
)

const rowByDescriptor = computed(() => {
  const map = new Map<string, (typeof rows.value)[number]>()
  for (const row of rows.value) if (row.wine_style === style.value) map.set(row.descriptor_id, row)
  return map
})

const countByStyle = computed(() => {
  const map: Partial<Record<WineStyle, number>> = {}
  for (const row of rows.value) map[row.wine_style] = (map[row.wine_style] ?? 0) + 1
  return map
})

async function toggle(descriptor: FlavorDescriptorRecord) {
  if (!props.appellationId || busy.value.has(descriptor.id)) return
  feedback.value = null
  busy.value.add(descriptor.id)
  try {
    const existing = rowByDescriptor.value.get(descriptor.id)
    if (existing) {
      await appellationFlavorsStore.remove(existing)
    } else {
      await appellationFlavorsStore.add({
        appellation_id: props.appellationId,
        descriptor_id: descriptor.id,
        wine_style: style.value,
      })
    }
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Failed to update descriptor.'
  } finally {
    busy.value.delete(descriptor.id)
  }
}
</script>

<template>
  <div v-if="appellationId" class="space-y-3 rounded-lg border border-border p-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-foreground">Typical aromas &amp; flavours</p>
        <p class="text-xs text-muted-foreground">Tick WSET descriptors per wine style.</p>
      </div>
      <div class="w-44 space-y-1">
        <Label>Style</Label>
        <Select v-model="style">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="token in styleOptions" :key="token" :value="token">
              {{ wineStyleLabel(token) }}
              <span v-if="countByStyle[token]" class="text-muted-foreground">
                ({{ countByStyle[token] }})
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div v-for="entry in lexicon" :key="entry.level">
      <p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-700">
        {{ flavorLevelCopy(entry.level).title }}
      </p>
      <div
        v-for="cluster in entry.clusters"
        :key="cluster.id"
        class="grid grid-cols-[160px_1fr] gap-2 border-t border-border/60 py-1.5 max-sm:grid-cols-1"
      >
        <span class="text-xs text-foreground/[0.6]">{{ clusterLabel(cluster) }}</span>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="descriptor in cluster.descriptors"
            :key="descriptor.id"
            type="button"
            class="rounded-full border px-2 py-0.5 text-xs transition-colors"
            :class="
              rowByDescriptor.has(descriptor.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-foreground/70 hover:border-foreground/40'
            "
            :disabled="busy.has(descriptor.id)"
            @click="toggle(descriptor)"
          >
            {{ descriptor.name }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="feedback" class="text-sm text-destructive">{{ feedback }}</p>
  </div>
</template>
