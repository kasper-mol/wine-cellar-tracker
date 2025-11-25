<script setup lang="ts">
import AppellationDescriptionCard from '@/components/WineAppellations/AppellationDescriptionCard.vue'
import GrapeCompositionSection from '@/components/WineAppellations/GrapeCompositionSection.vue'
import type { GrapeAppellationRecord } from '@/services/grapeAppellations'

defineProps<{
  description: string | null
  grapeRules: GrapeAppellationRecord[]
  grapeRulesLoading: boolean
  appellationName: string
}>()
</script>

<template>
  <section class="grid gap-8 lg:grid-cols-2">
    <AppellationDescriptionCard :description="description" />
    <div class="rounded-xl border border-border bg-card p-6">
      <GrapeCompositionSection
        :rules="grapeRules"
        :loading="grapeRulesLoading"
        :appellation-name="appellationName"
      />
    </div>
  </section>
</template>
