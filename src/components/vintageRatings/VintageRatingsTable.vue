<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Seg, SegOption } from '@/components/ui/seg'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { VintageRatingsBySource } from '@/types/vintageRatings'

type VintageRatingInput = {
  year: number
  score?: number | null
  rating?: string | number | null
  indicator?: string | null
  description?: string | null
  maturity?: string | null
  structure_flags?: string[] | null
  fallback?: boolean
}

type VintageSourceInput =
  | (Omit<VintageRatingsBySource, 'ratings'> & { ratings: VintageRatingInput[] })
  | {
      source: string
      source_name?: string
      ratings: VintageRatingInput[]
    }

interface NormalizedSource {
  id: string
  name: string
  ratings: {
    year: number
    score: number | null
    indicator: string | null
    description: string | null
    maturity: string | null
    structureFlags: string[]
    fallback: boolean
    rawLabel: string | number | null
  }[]
}

const indicatorLegend: Record<string, string> = {
  C: 'Caution, may be too old',
  E: 'Early maturing and accessible',
  NV: 'Vintage not declared',
  I: 'Irregular, even among the best wines',
  NT: 'Not yet sufficiently tasted to rate',
  R: 'Ready to drink',
  T: 'Still tannic, youthful or slow to mature',
  O: 'Outstanding',
  G: 'Good',
  A: 'Average',
  D: 'Developing',
}

/** One monotonic scale off the accent ramp, replacing six unrelated hues. */
const ratingRanges = [
  { range: '96–100', label: 'Extraordinary', color: '#7d5411', min: 96, max: 100 },
  { range: '90–95', label: 'Outstanding', color: '#a06f24', min: 90, max: 95.99 },
  { range: '80–89', label: 'Above average to excellent', color: '#c28d41', min: 80, max: 89.99 },
  { range: '70–79', label: 'Average', color: '#e1ad66', min: 70, max: 79.99 },
  { range: '60–69', label: 'Below average', color: '#9b9797', min: 60, max: 69.99 },
  { range: '< 59', label: 'Appalling', color: '#bab6b6', min: -Infinity, max: 59.99 },
]

const NO_SCORE_COLOR = '#9b9797'

const maturityFlags = [
  { code: 'C', label: indicatorLegend.C },
  { code: 'E', label: indicatorLegend.E },
  { code: 'NV', label: indicatorLegend.NV },
  { code: 'I', label: indicatorLegend.I },
  { code: 'NT', label: indicatorLegend.NT },
  { code: 'R', label: indicatorLegend.R },
  { code: 'T', label: indicatorLegend.T },
]

const props = defineProps<{
  data: VintageSourceInput[]
  fallbackData?: VintageSourceInput[]
  isFallback?: boolean
  title?: string
}>()

const titleText = computed(() => props.title ?? 'Vintage ratings')

function extractNumericScore(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const match = String(value).match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSources(items: VintageSourceInput[]): NormalizedSource[] {
  return items.map((item) => {
    const fromApi = 'source_id' in item
    const id = fromApi ? item.source_id : item.source
    const name =
      ('source_name' in item && item.source_name) ||
      (!fromApi && typeof item.source === 'string' ? item.source : id) ||
      'Source'

    const ratings = item.ratings.map((rating) => {
      const score = rating.score ?? extractNumericScore(rating.rating)
      return {
        year: rating.year,
        score: score ?? null,
        indicator: rating.indicator ?? null,
        description: rating.description ?? null,
        maturity: rating.maturity ?? null,
        structureFlags: rating.structure_flags ?? [],
        fallback: Boolean(rating.fallback),
        rawLabel: rating.rating ?? rating.score ?? null,
      }
    })

    return { id, name, ratings }
  })
}

const effectiveData = computed<NormalizedSource[]>(() =>
  props.data.length > 0 ? normalizeSources(props.data) : normalizeSources(props.fallbackData ?? []),
)

const selectedSourceId = ref<string | null>(effectiveData.value[0]?.id ?? null)

watch(effectiveData, (val) => {
  const first = val[0]
  if (!first) {
    selectedSourceId.value = null
    return
  }
  if (!val.some((item) => item.id === selectedSourceId.value)) {
    selectedSourceId.value = first.id
  }
})

const currentData = computed(() => {
  if (!effectiveData.value.length) return null
  const byId = effectiveData.value.find((item) => item.id === selectedSourceId.value)
  return byId ?? effectiveData.value[0]
})

const ratings = computed(() => currentData.value?.ratings ?? [])

const allFallbackRatings = computed(
  () => ratings.value.length > 0 && ratings.value.every((rating) => rating.fallback),
)

const usingFallback = computed(
  () =>
    props.isFallback ||
    (props.data.length === 0 && (props.fallbackData?.length ?? 0) > 0) ||
    allFallbackRatings.value,
)

const hasData = computed(() => effectiveData.value.length > 0)

function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return NO_SCORE_COLOR
  const match = ratingRanges.find((range) => score >= range.min && score <= range.max)
  return match?.color ?? NO_SCORE_COLOR
}
</script>

<template>
  <section v-if="hasData">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-4">
      <h2 class="font-heading text-[30px] font-normal">{{ titleText }}</h2>
      <div class="flex items-center gap-3">
        <Badge v-if="usingFallback" data-testid="vintage-fallback-badge">Region data</Badge>
        <Seg v-if="effectiveData.length > 1" v-model="selectedSourceId" name="vintage-source">
          <SegOption v-for="option in effectiveData" :key="option.id" :value="option.id">
            {{ option.name }}
          </SegOption>
        </Seg>
      </div>
    </div>

    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[74px] text-right">Vintage</TableHead>
          <TableHead class="w-[150px]">Rating</TableHead>
          <TableHead class="w-[110px]">Structure</TableHead>
          <TableHead class="w-[150px]">Maturity</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="rating in ratings" :key="rating.year">
          <TableCell class="num text-right font-heading text-[18px]">{{ rating.year }}</TableCell>
          <TableCell>
            <span class="inline-flex items-center gap-2">
              <span
                class="num font-heading text-[21px]"
                :style="{ color: getScoreColor(rating.score) }"
              >
                {{ rating.score ?? rating.rawLabel ?? '—' }}
              </span>
              <span
                v-if="rating.score !== null"
                class="relative inline-block h-1 w-16 bg-foreground/[0.08]"
              >
                <span
                  class="absolute inset-y-0 left-0"
                  :style="{
                    width: `${Math.max(0, Math.min(100, rating.score))}%`,
                    background: getScoreColor(rating.score),
                  }"
                />
              </span>
              <Badge v-if="rating.indicator" variant="secondary">{{ rating.indicator }}</Badge>
            </span>
          </TableCell>
          <TableCell>
            <span class="flex flex-wrap gap-1">
              <Badge v-for="flag in rating.structureFlags" :key="flag" variant="secondary">
                {{ flag }}
              </Badge>
              <span v-if="!rating.structureFlags.length" class="text-sm text-foreground/40">
                —
              </span>
            </span>
          </TableCell>
          <TableCell class="text-[13px]">{{ rating.maturity || '—' }}</TableCell>
          <TableCell class="text-[13px] leading-[1.6] text-foreground/[0.76]">
            {{ rating.description || '—' }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="mt-6 grid grid-cols-2 gap-8 border-t border-border pt-4 max-md:grid-cols-1">
      <div>
        <h3 class="mb-3 text-[13px] uppercase tracking-[0.1em] text-accent-700">Rating ranges</h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs max-sm:grid-cols-1">
          <div v-for="range in ratingRanges" :key="range.range" class="flex items-baseline gap-2">
            <span
              class="relative top-[-3px] h-[3px] w-3.5 flex-none"
              :style="{ background: range.color }"
              aria-hidden="true"
            />
            <span class="num w-[52px] flex-none font-semibold">{{ range.range }}</span>
            <span class="text-foreground/60">{{ range.label }}</span>
          </div>
        </div>
      </div>
      <div>
        <h3 class="mb-3 text-[13px] uppercase tracking-[0.1em] text-accent-700">Maturity keys</h3>
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs max-sm:grid-cols-1">
          <div v-for="flag in maturityFlags" :key="flag.code" class="flex gap-2">
            <span class="num w-[22px] flex-none font-semibold">{{ flag.code }}</span>
            <span class="text-foreground/60">{{ flag.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
