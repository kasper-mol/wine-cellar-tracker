<script setup lang="ts">
import { computed } from 'vue'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FlavorDescriptorRecord } from '@/services/flavorDescriptors'

const props = defineProps<{
  title: string
  descriptors: FlavorDescriptorRecord[]
}>()

const count = computed(() => props.descriptors.length)
</script>

<template>
  <Card class="border-border bg-card p-5">
    <div class="flex items-center justify-between gap-2">
      <h3 class="font-serif text-2xl font-semibold text-card-foreground">
        {{ title }}
      </h3>
      <span class="text-sm text-muted-foreground">{{ count }} flavors</span>
    </div>
    <div class="mt-4 flex flex-wrap gap-2">
      <Badge v-for="descriptor in descriptors" :key="descriptor.id" variant="secondary">
        {{ descriptor.name }}
      </Badge>
    </div>
  </Card>
</template>
