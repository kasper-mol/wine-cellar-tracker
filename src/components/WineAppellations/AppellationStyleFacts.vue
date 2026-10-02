<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { styleFacts } from '@/lib/appellationStyleView'
import { wineStyleLabel } from '@/lib/wineStyles'
import type { AppellationStyleProfileRecord } from '@/types/appellationStyleProfiles'
import type { WineAppellationRecord, WineStyle } from '@/types/wineAppellations'

const props = defineProps<{
  appellation: WineAppellationRecord
  style: WineStyle
  profile?: AppellationStyleProfileRecord | null
}>()

const facts = computed(() => styleFacts(props.appellation, props.profile))

const rows = computed(() =>
  [
    { label: 'Style', value: facts.value.summary, shared: facts.value.summaryIsShared },
    {
      label: 'Drinking window',
      value: facts.value.drinkingWindow,
      shared: facts.value.drinkingWindowIsShared,
    },
  ].filter((row): row is { label: string; value: string; shared: boolean } => Boolean(row.value)),
)
</script>

<template>
  <dl
    v-if="rows.length || facts.grapes.length"
    class="m-0 border-b border-border"
    :aria-label="`${wineStyleLabel(style)} wine`"
  >
    <div
      v-for="row in rows"
      :key="row.label"
      class="grid grid-cols-[150px_1fr] items-baseline gap-4 border-t border-border py-2.5 max-md:grid-cols-1 max-md:gap-1"
    >
      <dt class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        {{ row.label }}
      </dt>
      <dd class="text-sm leading-[1.6] text-foreground/80">
        {{ row.value }}
        <span v-if="row.shared" class="ml-1 text-[11px] italic text-foreground/[0.45]">
          · written for the appellation as a whole
        </span>
      </dd>
    </div>

    <div
      v-if="facts.grapes.length"
      class="grid grid-cols-[150px_1fr] items-baseline gap-4 border-t border-border py-2.5 max-md:grid-cols-1 max-md:gap-1"
    >
      <dt class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
        Signature grapes
      </dt>
      <dd class="m-0 flex flex-wrap items-center gap-1.5">
        <Badge v-for="grape in facts.grapes" :key="grape" variant="outline">{{ grape }}</Badge>
        <span v-if="facts.grapesAreShared" class="text-[11px] italic text-foreground/[0.45]">
          · all styles
        </span>
      </dd>
    </div>
  </dl>
</template>
