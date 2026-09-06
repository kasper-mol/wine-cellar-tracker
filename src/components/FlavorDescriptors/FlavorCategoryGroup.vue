<script setup lang="ts">
import { computed } from 'vue'
import type { FlavorDescriptorRecord } from '@/types/flavorDescriptors'

const props = defineProps<{
  title: string
  descriptors: FlavorDescriptorRecord[]
}>()

const sorted = computed(() => [...props.descriptors].sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
  <div>
    <h3 class="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-700">
      {{ title }}
    </h3>
    <ul class="m-0 list-none p-0">
      <li
        v-for="descriptor in sorted"
        :key="descriptor.id"
        class="border-b border-border py-1 text-sm"
      >
        {{ descriptor.name }}
      </li>
    </ul>
  </div>
</template>
