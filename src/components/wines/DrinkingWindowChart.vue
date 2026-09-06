<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { PHASE_COLOR, PHASE_LABEL, PHASE_ORDER } from '@/lib/phase'
import type { PhaseNow } from '@/types/drinkingWindow'

export interface TimelineRow {
  id: string
  name: string
  vintage: number
  enter: number
  drinkBy: number
  phase: PhaseNow
}

const props = defineProps<{
  rows: TimelineRow[]
  /** Labels whose appellation/region has no archetype mapped. */
  unmappedCount: number
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean] }>()

const T0 = computed(() =>
  Math.min(2005, ...props.rows.map((row) => row.enter).filter((year) => Number.isFinite(year))),
)
const T1 = computed(() =>
  Math.max(2055, ...props.rows.map((row) => row.drinkBy).filter((year) => Number.isFinite(year))),
)
const span = computed(() => Math.max(1, T1.value - T0.value))

function pct(year: number) {
  return `${((year - T0.value) / span.value) * 100}%`
}

const decades = computed(() => {
  const out: { year: number; left: string }[] = []
  for (let year = Math.ceil((T0.value + 1) / 10) * 10; year < T1.value; year += 10) {
    out.push({ year, left: pct(year) })
  }
  return out
})

const nowLeft = computed(() => pct(new Date().getFullYear()))

const bars = computed(() =>
  props.rows.map((row) => ({
    ...row,
    color: PHASE_COLOR[row.phase],
    left: pct(row.enter),
    width: `${((row.drinkBy - row.enter) / span.value) * 100}%`,
    labelLeft: `calc(${pct(row.drinkBy)} + 8px)`,
  })),
)

const legend = computed(() =>
  PHASE_ORDER.map((phase) => ({ label: PHASE_LABEL[phase], color: PHASE_COLOR[phase] })),
)
</script>

<template>
  <section class="mb-8">
    <div class="mb-4 flex flex-wrap items-baseline gap-3">
      <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">II.</span>
      <h2 class="font-heading text-[34px] font-normal">Drinking windows</h2>
      <span class="ml-auto text-xs text-foreground/50">
        Each rule spans the estimated window; the gold mark is today
      </span>
      <Button variant="ghost" size="sm" @click="emit('update:open', !open)">
        {{ open ? 'Hide' : 'Show' }}
      </Button>
    </div>

    <template v-if="open">
      <div
        v-if="bars.length"
        class="grid grid-cols-[250px_1fr] border-y border-border max-lg:grid-cols-[150px_1fr] max-sm:grid-cols-1"
      >
        <div class="border-r border-border" />
        <div class="relative h-[26px]">
          <span
            v-for="decade in decades"
            :key="decade.year"
            class="num absolute top-1.5 -translate-x-1/2 text-[11px] tracking-[0.08em] text-foreground/45"
            :style="{ left: decade.left }"
          >
            {{ decade.year }}
          </span>
        </div>

        <template v-for="row in bars" :key="row.id">
          <div
            class="flex items-baseline gap-2 border-r border-t border-border py-[9px] pr-3 max-sm:border-r-0 max-sm:pb-0"
          >
            <span
              class="num w-[34px] shrink-0 text-xs text-foreground/45 max-lg:hidden max-sm:inline"
            >
              {{ row.vintage || 'NV' }}
            </span>
            <span class="truncate text-[13px]">{{ row.name }}</span>
          </div>
          <div class="relative border-t border-border py-[9px] max-sm:border-t-0 max-sm:pt-0">
            <span
              v-for="decade in decades"
              :key="`grid-${row.id}-${decade.year}`"
              class="absolute inset-y-0 w-px bg-foreground/[0.07]"
              :style="{ left: decade.left }"
            />
            <span class="absolute inset-y-0 w-px bg-primary" :style="{ left: nowLeft }" />
            <span
              class="absolute top-3.5 h-[5px] border-y"
              :style="{
                left: row.left,
                width: row.width,
                borderColor: row.color,
                background: `color-mix(in srgb, ${row.color} 14%, transparent)`,
              }"
            />
            <span
              class="num absolute top-2 whitespace-nowrap text-[11px] text-foreground/50"
              :style="{ left: row.labelLeft }"
            >
              {{ row.enter }}–{{ row.drinkBy }}
            </span>
          </div>
        </template>
      </div>

      <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
        No drinking windows computed yet.
      </p>

      <div class="mt-3 flex flex-wrap gap-4">
        <span
          v-for="item in legend"
          :key="item.label"
          class="inline-flex items-center gap-[7px] text-[11px] uppercase tracking-[0.1em] text-foreground/60"
        >
          <span
            class="h-[5px] w-[18px] border-y"
            :style="{
              borderColor: item.color,
              background: `color-mix(in srgb, ${item.color} 14%, transparent)`,
            }"
          />
          {{ item.label }}
        </span>
      </div>

      <p v-if="unmappedCount" class="mt-3 text-xs text-foreground/50">
        {{ unmappedCount }} label{{ unmappedCount === 1 ? '' : 's' }} have no archetype mapped —
        <RouterLink to="/manage/drinking-window" class="underline decoration-dotted">
          map them
        </RouterLink>
      </p>
    </template>
  </section>
</template>
