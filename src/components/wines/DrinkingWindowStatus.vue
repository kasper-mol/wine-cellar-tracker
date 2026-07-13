<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Info } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import type { UserWine } from '@/types/wines'
import type { PhaseNow, Confidence } from '@/types/drinkingWindow'

const props = defineProps<{ wine: UserWine }>()
const dwStore = useDrinkingWindowStore()

const window = computed(() => dwStore.computeWindow(props.wine))

const PHASE_CLASS: Record<PhaseNow, string> = {
  Hold: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Approachable: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  'At peak': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'Mature — drink up': 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  'Past prime': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
}

const PHASE_TITLE: Record<PhaseNow, string> = {
  Hold: 'Too young — let it rest.',
  Approachable: 'Drinkable but not yet at its best.',
  'At peak': 'Prime drinking window.',
  'Mature — drink up': 'Past peak — drink soon before it fades.',
  'Past prime': 'Likely over the hill.',
}

const CONFIDENCE_TITLE: Record<Confidence, string> = {
  High: 'High — based on a published critic window for this specific wine.',
  Medium: 'Medium — based on a regional vintage rating or formula with score data.',
  Low: 'Low — formula only, no vintage score available, or this appellation has high natural variability (Grand Cru, predikat wines). Treat the dates as a rough guide only.',
}
</script>

<template>
  <div v-if="window" class="flex flex-col gap-1" :class="window.confidence === 'Low' && 'opacity-60'">
    <span
      class="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium cursor-help"
      :class="PHASE_CLASS[window.phaseNow]"
      :title="PHASE_TITLE[window.phaseNow]"
    >
      {{ window.phaseNow }}
    </span>
    <span class="text-xs text-muted-foreground">
      {{ window.enter }}–{{ window.drinkBy }}
      <span class="opacity-70">±{{ window.uncertaintyYears }}y</span>
    </span>
    <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Badge
        variant="outline"
        class="cursor-help px-1 py-0 text-[10px]"
        :title="CONFIDENCE_TITLE[window.confidence]"
      >
        {{ window.confidence }}
      </Badge>
      <span
        v-if="window.notes.length"
        :title="window.notes.join('\n')"
        class="inline-flex cursor-help items-center"
      >
        <Info class="h-3 w-3" />
      </span>
    </span>
  </div>
  <RouterLink
    v-else
    to="/manage/drinking-window"
    class="text-xs text-muted-foreground underline decoration-dotted hover:text-foreground"
    title="No archetype mapped for this wine's appellation/region"
  >
    Needs mapping
  </RouterLink>
</template>
