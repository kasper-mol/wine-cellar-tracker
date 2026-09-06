<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

defineOptions({
  name: 'EditorialBreadcrumb',
})

export interface Crumb {
  label: string
  to?: RouteLocationRaw
}

defineProps<{ items: Crumb[] }>()
</script>

<template>
  <p class="mb-4 text-xs text-foreground/[0.55]">
    <template v-for="(item, index) in items" :key="index">
      <span v-if="index > 0">&nbsp;/&nbsp;</span>
      <RouterLink v-if="item.to" :to="item.to" class="text-accent-700 hover:underline">
        {{ item.label }}
      </RouterLink>
      <span v-else>{{ item.label }}</span>
    </template>
  </p>
</template>
