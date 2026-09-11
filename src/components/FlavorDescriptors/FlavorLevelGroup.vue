<script setup lang="ts">
import { computed } from 'vue'
import FlavorClusterRow from '@/components/FlavorDescriptors/FlavorClusterRow.vue'
import { flavorLevelCopy } from '@/content/flavorLevels'
import type { FlavorClusterWithDescriptors, FlavorLevel } from '@/types/flavorDescriptors'

const props = defineProps<{
  level: FlavorLevel
  numeral: string
  clusters: FlavorClusterWithDescriptors[]
}>()

const copy = computed(() => flavorLevelCopy(props.level))

const totalCount = computed(() =>
  props.clusters.reduce((sum, cluster) => sum + cluster.descriptors.length, 0),
)
</script>

<template>
  <section class="mb-12">
    <div class="mb-1 flex flex-wrap items-baseline gap-3 border-b border-border pb-2">
      <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">{{ numeral }}</span>
      <h2 class="font-heading text-[34px] font-normal">{{ copy.title }}</h2>
      <span class="num ml-auto text-xs text-foreground/50">
        {{ clusters.length }} clusters · {{ totalCount }} descriptors
      </span>
    </div>
    <p class="mb-5 text-[13px] italic text-foreground/[0.62]">{{ copy.subtitle }}</p>

    <div class="grid grid-cols-[220px_1fr] gap-x-10 max-lg:grid-cols-1">
      <aside class="max-lg:mb-4">
        <p class="num mb-2 text-[11px] uppercase tracking-[0.18em] text-foreground/50">
          Key questions
        </p>
        <ul class="m-0 list-none p-0 text-[13px] leading-[1.6] text-foreground/[0.7]">
          <li v-for="question in copy.questions" :key="question" class="mb-1">
            {{ question }}
          </li>
        </ul>
      </aside>

      <div class="border-t border-border">
        <FlavorClusterRow v-for="cluster in clusters" :key="cluster.id" :cluster="cluster" />
        <p v-if="!clusters.length" class="py-3 text-sm italic text-foreground/[0.45]">
          No clusters at this level yet.
        </p>
      </div>
    </div>
  </section>
</template>
