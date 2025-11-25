<script setup lang="ts">
import type { BadgeVariants } from '@/components/ui/badge'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { GrapeAppellationRecord, GrapeRuleType } from '@/services/grapeAppellations'

const props = defineProps<{
  rules: GrapeAppellationRecord[]
  loading?: boolean
  appellationName: string
}>()

const grapeRuleMeta: Record<
  GrapeRuleType,
  { label: string; description: string; badge: BadgeVariants['variant'] }
> = {
  allowed: {
    label: 'Allowed',
    description: 'May be used freely in wines from this appellation.',
    badge: 'secondary',
  },
  required: {
    label: 'Required',
    description: 'Must appear in the blend at the stated minimum.',
    badge: 'default',
  },
  forbidden: {
    label: 'Forbidden',
    description: 'Not permitted in wines from this appellation.',
    badge: 'destructive',
  },
}

function formatPercentage(value: number | null | undefined) {
  if (value === null || value === undefined) return 'N/A'
  return `${value}%`
}
</script>

<template>
  <div>
    <h2 class="mb-6 font-serif text-3xl font-semibold text-foreground">Grape Composition</h2>

    <p v-if="loading" class="text-muted-foreground">Loading grape rules...</p>
    <p v-else-if="!rules.length" class="text-muted-foreground">
      No grape rules have been defined for this appellation yet.
    </p>

    <div v-else class="grid gap-4">
      <Card
        v-for="rule in rules"
        :key="rule.id"
        class="border-border bg-card p-6 shadow-sm transition hover:shadow-md"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="font-serif text-2xl font-semibold text-card-foreground">
              {{ rule.grape?.name ?? 'Unnamed Grape' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ grapeRuleMeta[rule.rule].description }}
            </p>
          </div>
          <Badge :variant="grapeRuleMeta[rule.rule].badge">
            {{ grapeRuleMeta[rule.rule].label }}
          </Badge>
        </div>

        <div v-if="rule.rule !== 'forbidden'" class="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <div class="rounded border border-dashed border-border/60 p-3">
            <p class="text-xs uppercase tracking-wide">Min Percentage</p>
            <p class="text-lg font-semibold text-card-foreground">
              {{ formatPercentage(rule.min_pct) }}
            </p>
          </div>
          <div class="rounded border border-dashed border-border/60 p-3">
            <p class="text-xs uppercase tracking-wide">Max Percentage</p>
            <p class="text-lg font-semibold text-card-foreground">
              {{ formatPercentage(rule.max_pct) }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="mt-4 rounded border border-dashed border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          This grape is prohibited in wines from {{ appellationName }}.
        </div>
      </Card>
    </div>
  </div>
</template>
