<script setup lang="ts">
import { clusterLabel } from '@/content/flavorLevels'
import type { FlavorClusterWithDescriptors } from '@/types/flavorDescriptors'

defineProps<{
  cluster: FlavorClusterWithDescriptors
}>()
</script>

<template>
  <div class="grid grid-cols-[180px_1fr] gap-x-6 border-b border-border py-3 max-md:grid-cols-1">
    <div class="max-md:mb-1">
      <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-accent-700">
        {{ clusterLabel(cluster) }}
      </h3>
      <p v-if="cluster.description" class="mt-0.5 text-[11px] italic text-foreground/[0.55]">
        {{ cluster.description }}
      </p>
    </div>
    <p v-if="cluster.descriptors.length" class="m-0 text-[15px] leading-[1.7]">
      <template v-for="(descriptor, index) in cluster.descriptors" :key="descriptor.id">
        <span>{{ descriptor.name }}</span>
        <span v-if="descriptor.note" class="text-foreground/[0.55]"> ({{ descriptor.note }})</span>
        <span v-if="index < cluster.descriptors.length - 1" class="text-foreground/40">, </span>
      </template>
    </p>
    <p v-else class="m-0 text-sm italic text-foreground/[0.45]">No descriptors yet.</p>
  </div>
</template>
