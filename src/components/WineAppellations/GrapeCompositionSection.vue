<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { BadgeVariants } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GrapeAppellationRecord, GrapeRuleType } from '@/types/grapeAppellations'

const props = defineProps<{
  rules: GrapeAppellationRecord[]
  loading?: boolean
  appellationName: string
}>()

const grapeRuleMeta: Record<
  GrapeRuleType,
  { label: string; description: string; badge: BadgeVariants['variant'] }
> = {
  required: {
    label: 'Required',
    description: 'Must appear in the blend at the stated minimum.',
    badge: 'default',
  },
  allowed: {
    label: 'Allowed',
    description: 'May be used freely in wines from this appellation.',
    badge: 'secondary',
  },
  forbidden: {
    label: 'Forbidden',
    description: 'Not permitted in wines from this appellation.',
    badge: 'outline',
  },
}

const RULE_ORDER: GrapeRuleType[] = ['required', 'allowed', 'forbidden']

const sortedRules = computed(() =>
  [...props.rules].sort((a, b) => {
    const byRule = RULE_ORDER.indexOf(a.rule) - RULE_ORDER.indexOf(b.rule)
    if (byRule !== 0) return byRule
    return (b.min_pct ?? 0) - (a.min_pct ?? 0)
  }),
)

function shareLabel(rule: GrapeAppellationRecord) {
  if (rule.rule === 'forbidden') return '—'
  if (rule.min_pct === null && rule.max_pct === null) return '—'
  return `${rule.min_pct ?? 0} – ${rule.max_pct ?? 100}%`
}

function shareWidth(rule: GrapeAppellationRecord) {
  if (rule.rule === 'forbidden') return '0%'
  return `${Math.max(0, Math.min(100, rule.min_pct ?? 0))}%`
}

function note(rule: GrapeAppellationRecord) {
  if (rule.rule === 'forbidden') {
    return `Not permitted in wines from ${props.appellationName}.`
  }
  return grapeRuleMeta[rule.rule]?.description ?? ''
}
</script>

<template>
  <section>
    <h2 class="mb-3 mt-8 font-heading text-[30px] font-normal">Grape composition</h2>

    <div v-if="loading" class="border-t border-border">
      <div v-for="row in 4" :key="`grape-skeleton-${row}`" class="border-b border-border py-2">
        <span class="block h-4 w-full bg-foreground/[0.06]" />
      </div>
    </div>

    <p
      v-else-if="!sortedRules.length"
      class="border-y border-border py-3 text-sm text-foreground/[0.55]"
    >
      No grape rules have been defined for this appellation yet.
    </p>

    <Table v-else>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead>Grape</TableHead>
          <TableHead class="w-[120px]">Rule</TableHead>
          <TableHead class="w-[220px]">Permitted share</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="rule in sortedRules" :key="rule.id">
          <TableCell class="font-heading text-[20px]">
            {{ rule.grape?.name ?? 'Unnamed grape' }}
          </TableCell>
          <TableCell>
            <Badge :variant="grapeRuleMeta[rule.rule]?.badge">
              {{ grapeRuleMeta[rule.rule]?.label ?? rule.rule }}
            </Badge>
          </TableCell>
          <TableCell>
            <span class="flex items-center gap-2.5">
              <span class="relative inline-block h-[5px] flex-1 bg-foreground/[0.08]">
                <span
                  class="absolute inset-y-0 left-0 border-y border-primary"
                  :style="{
                    width: shareWidth(rule),
                    background: 'color-mix(in srgb, hsl(var(--primary)) 22%, transparent)',
                  }"
                />
              </span>
              <span class="num w-[76px] flex-none text-xs text-foreground/60">
                {{ shareLabel(rule) }}
              </span>
            </span>
          </TableCell>
          <TableCell class="text-[13px] leading-[1.6] text-foreground/[0.74]">
            {{ note(rule) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </section>
</template>
