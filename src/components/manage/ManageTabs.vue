<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { label: 'Countries', to: '/manage/wine-countries' },
  { label: 'Regions', to: '/manage/wine-regions' },
  { label: 'Appellations', to: '/manage/wine-appellations' },
  { label: 'Grape varieties', to: '/manage/grape-varieties' },
  { label: 'Vintage ratings', to: '/manage/vintage-ratings' },
  { label: 'Flavour descriptors', to: '/manage/flavor-descriptors' },
  { label: 'Wine maps', to: '/manage/wine-maps' },
  { label: 'Drinking window', to: '/manage/drinking-window' },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav class="mb-4 flex flex-wrap gap-4 border-b border-border">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="border-b-2 pb-2 text-[13px] tracking-[0.04em] transition-colors"
      :class="
        isActive(tab.to)
          ? 'border-primary text-primary'
          : 'border-transparent text-foreground/[0.62]'
      "
    >
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
