<script setup lang="ts">
defineProps<{
  countryName: string
  regions: Array<{
    id: string
    name: string
    appellationCount: number
    holding: string
  }>
}>()

const emit = defineEmits<{ (e: 'select-region', id: string): void }>()
</script>

<template>
  <section>
    <h2 class="mb-4 mt-8 font-heading text-[30px] font-normal">Regions of {{ countryName }}</h2>

    <div class="border-t border-border">
      <a
        v-for="(region, index) in regions"
        :key="region.id"
        href="#"
        class="group grid grid-cols-[34px_1fr_130px_120px] items-baseline gap-4 border-b border-border px-2 py-[11px] transition-colors hover:bg-primary/5"
        @click.prevent="emit('select-region', region.id)"
      >
        <span class="num text-right text-xs text-foreground/[0.38]">{{ index + 1 }}</span>
        <span class="font-heading text-[21px] transition-colors group-hover:text-accent-700">
          {{ region.name }}
        </span>
        <span class="num text-xs text-foreground/[0.55]">
          {{ region.appellationCount }} appellations
        </span>
        <span
          class="num text-right text-xs"
          :class="region.holding === '—' ? 'text-foreground/30' : 'text-accent-700'"
        >
          {{ region.holding }}
        </span>
      </a>
    </div>

    <p v-if="!regions.length" class="border-b border-border py-3 text-sm text-foreground/[0.55]">
      No regions catalogued for this country yet.
    </p>
  </section>
</template>
