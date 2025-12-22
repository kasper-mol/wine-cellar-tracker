<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle } from 'lucide-vue-next'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { VintageRatingsBySource } from '@/services/vintageRatings'

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

const ratingRanges = [
  { range: '96-100', label: 'Extraordinary', color: '#a47b00', min: 96, max: 100 },
  { range: '90-95', label: 'Outstanding', color: '#d27745', min: 90, max: 95.99 },
  { range: '80-89', label: 'Above Average to Excellent', color: '#c1121f', min: 80, max: 89.99 },
  { range: '70-79', label: 'Average', color: '#7a0d1a', min: 70, max: 79.99 },
  { range: '60-69', label: 'Below Average', color: '#8b1e8b', min: 60, max: 69.99 },
  { range: '< 59', label: 'Appalling', color: '#3d246c', min: -Infinity, max: 59.99 },
]

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

const titleText = computed(() => props.title ?? 'Vintage Chart')

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

const usedIndicators = computed(() => {
  const set = new Set<string>()
  for (const rating of ratings.value) {
    if (rating.indicator) set.add(rating.indicator)
  }
  return Array.from(set)
})

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
  if (score === null || score === undefined || Number.isNaN(score)) return '#6b7280'
  const match = ratingRanges.find((range) => score >= range.min && score <= range.max)
  return match?.color ?? '#6b7280'
}
</script>

<template>
  <Card v-if="hasData" class="overflow-hidden border border-border bg-white">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
      <div class="flex items-center gap-3">
        <h3 class="font-serif text-lg font-semibold text-card-foreground">{{ titleText }}</h3>
        <div
          v-if="usingFallback"
          class="flex items-center gap-1.5 rounded bg-amber-50 px-2.5 py-1"
          data-testid="vintage-fallback-badge"
        >
          <AlertCircle class="h-3.5 w-3.5 text-amber-600" />
          <span class="text-xs font-medium text-amber-700">Region data</span>
        </div>
      </div>

      <Select v-if="effectiveData.length > 1" v-model="selectedSourceId">
        <SelectTrigger class="h-8 w-[180px] text-sm">
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="option in effectiveData" :key="option.id" :value="option.id">
            {{ option.name }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="grid gap-6 px-6 py-4 md:grid-cols-[1fr_4fr]">
      <!-- Legend column -->
      <div class="space-y-8">
        <div>
          <h4 class="mb-3 text-lg font-semibold text-slate-800">Rating ranges</h4>
          <div class="space-y-3">
            <div v-for="range in ratingRanges" :key="range.range" class="flex items-center gap-3">
              <span
                class="h-6 w-6 rounded-sm"
                :style="{ backgroundColor: range.color }"
                aria-hidden="true"
              />
              <div class="text-sm leading-tight text-slate-700">
                <div class="font-semibold">{{ range.range }}</div>
                <div class="text-slate-600">{{ range.label }}</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 class="mb-3 text-lg font-semibold text-slate-800">Maturity</h4>
          <div class="space-y-2 text-sm text-slate-700">
            <div v-for="flag in maturityFlags" :key="flag.code" class="flex gap-3">
              <span class="w-8 font-semibold text-slate-900">{{ flag.code }}</span>
              <span class="text-slate-700">{{ flag.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table column -->
      <div class="overflow-hidden rounded-md border border-border">
        <!-- Table Header -->
        <div
          class="grid grid-cols-[90px_140px_140px_160px_1fr] items-center gap-x-3 border-b border-border bg-white px-4 py-3 text-sm font-semibold text-slate-700"
        >
          <span>Vintage</span>
          <span>Rating</span>
          <span>Structure</span>
          <span>Maturity</span>
          <span>Description</span>
        </div>

        <!-- Table Rows -->
        <div>
          <div
            v-for="(rating, index) in ratings"
            :key="rating.year"
            class="grid grid-cols-[90px_140px_140px_160px_1fr] gap-x-3 border-b border-border px-4 py-5"
            :class="index === ratings.length - 1 ? 'border-b-0' : ''"
          >
            <!-- Year -->
            <span class="text-base font-normal text-slate-800">{{ rating.year }}</span>

            <!-- Rating -->
            <span
              v-if="rating.score !== null && rating.score !== undefined"
              class="text-base font-bold"
              :style="{ color: getScoreColor(rating.score) }"
            >
              {{ rating.score }}
              <span
                v-if="rating.indicator"
                class="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground"
              >
                {{ rating.indicator }}
              </span>
            </span>
            <span class="text-sm text-muted-foreground" v-else>
              {{ rating.rawLabel ?? '—' }}
              <span
                v-if="rating.indicator"
                class="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground"
              >
                {{ rating.indicator }}
              </span>
            </span>

            <!-- Structure flags -->
            <div class="flex flex-wrap gap-1">
              <span
                v-for="flag in rating.structureFlags"
                :key="flag"
                class="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground"
              >
                {{ flag }}
              </span>
              <span v-if="!rating.structureFlags.length" class="text-sm text-muted-foreground">—</span>
            </div>

            <!-- Maturity -->
            <span class="text-sm text-slate-700">
              {{ rating.maturity || '—' }}
            </span>

            <!-- Description -->
            <span class="text-sm leading-relaxed text-slate-600">
              {{ rating.description || '—' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
