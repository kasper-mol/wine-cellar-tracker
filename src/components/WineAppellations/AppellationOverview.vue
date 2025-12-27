<script setup lang="ts">
import MapViewer from '@/components/MapViewer.vue'
import GrapeCompositionSection from '@/components/WineAppellations/GrapeCompositionSection.vue'
import type { GrapeAppellationRecord } from '@/services/grapeAppellations'
import AppellationDescriptionCard from './AppellationDescriptionCard.vue'

defineProps<{
  name: string
  imageUrl: string | null
  regionName: string
  countryName: string
  grapeCount: number
  grapeRules: GrapeAppellationRecord[]
  grapeRulesLoading: boolean
  appelationDescription: string | null
}>()
</script>

<template>
  <section class="grid gap-8 md:grid-cols-2">
    <MapViewer :image-url="imageUrl" :title="name" />

    <div class="flex flex-col space-y-6">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Appellation Profile</p>
        <h1 class="mt-2 font-serif text-4xl font-semibold text-foreground">{{ name }}</h1>
        <p class="mt-2 text-muted-foreground">{{ regionName }} • {{ countryName }}</p>
      </div>

      <AppellationDescriptionCard :description="appelationDescription" />

      <div class="rounded-xl border border-border bg-card p-6">
        <GrapeCompositionSection
          :rules="grapeRules"
          :loading="grapeRulesLoading"
          :appellation-name="name"
        />
      </div>
    </div>
  </section>
</template>
