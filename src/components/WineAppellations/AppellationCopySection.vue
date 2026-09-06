<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { wineStyleLabel } from '@/lib/wineStyles'
import type { WineStyle } from '@/types/wineAppellations'

const props = defineProps<{
  signatureGrapes: string[] | null
  wineStyles: WineStyle[] | null
  styleSummary: string | null
  climateSoil: string | null
  /** Display string — printed as written, never parsed. */
  drinkingWindow: string | null
  foodPairings: string[] | null
  funFact: string | null
}>()

const hasChips = computed(
  () => Boolean(props.signatureGrapes?.length) || Boolean(props.wineStyles?.length),
)

/** Each fact stands on its own row; the block itself goes when none survive. */
const facts = computed(() =>
  [
    { label: 'Style', value: props.styleSummary },
    { label: 'Climate & soil', value: props.climateSoil },
    { label: 'Drinking window', value: props.drinkingWindow },
    { label: 'Pairings', value: props.foodPairings?.length ? props.foodPairings.join(' · ') : null },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value)),
)
</script>

<template>
  <section v-if="hasChips || facts.length || funFact" class="mt-8">
    <div v-if="hasChips" class="flex flex-col gap-3">
      <div v-if="signatureGrapes?.length">
        <p class="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          Signature grapes
        </p>
        <div class="flex flex-wrap gap-1.5">
          <Badge v-for="grape in signatureGrapes" :key="grape" variant="outline">
            {{ grape }}
          </Badge>
        </div>
      </div>

      <div v-if="wineStyles?.length">
        <p class="mb-1.5 text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">Styles</p>
        <div class="flex flex-wrap gap-1.5">
          <Badge v-for="style in wineStyles" :key="style">{{ wineStyleLabel(style) }}</Badge>
        </div>
      </div>
    </div>

    <dl v-if="facts.length" class="mt-6 border-t border-border">
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="grid grid-cols-[150px_1fr] items-baseline gap-4 border-b border-border py-2.5 max-md:grid-cols-1 max-md:gap-1"
      >
        <dt class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          {{ fact.label }}
        </dt>
        <dd class="text-sm leading-[1.6] text-foreground/80">{{ fact.value }}</dd>
      </div>
    </dl>

    <p
      v-if="funFact"
      class="mt-6 border-l-2 border-primary py-1 pl-4 text-sm italic leading-[1.7] text-foreground/[0.72]"
    >
      {{ funFact }}
    </p>
  </section>
</template>
