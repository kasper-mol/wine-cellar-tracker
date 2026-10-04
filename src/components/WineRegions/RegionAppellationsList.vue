<script setup lang="ts">
defineProps<{
  regionName: string
  appellations: Array<{
    id: string
    name: string
    shortDescription: string | null
    holding: string
  }>
}>()

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()
</script>

<template>
  <section>
    <h2 class="mb-4 mt-8 font-heading text-[30px] font-normal">Appellations of {{ regionName }}</h2>

    <div class="border-t border-border">
      <a
        v-for="(appellation, index) in appellations"
        :key="appellation.id"
        href="#"
        class="group grid grid-cols-[34px_minmax(0,1fr)_minmax(0,1.3fr)_120px] items-baseline gap-4 border-b border-border px-2 py-[11px] transition-colors hover:bg-primary/5 max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-0.5"
        @click.prevent="emit('select-appellation', appellation.id)"
      >
        <span class="num text-right text-xs text-foreground/[0.38] max-sm:hidden">{{
          index + 1
        }}</span>
        <span class="font-heading text-[21px] transition-colors group-hover:text-accent-700">
          {{ appellation.name }}
        </span>
        <span
          class="truncate text-xs text-foreground/[0.55] max-sm:col-span-2 max-sm:row-start-2"
          :title="appellation.shortDescription || undefined"
        >
          {{ appellation.shortDescription || '' }}
        </span>
        <span
          class="num text-right text-xs max-sm:col-start-2 max-sm:row-start-1"
          :class="appellation.holding === '—' ? 'text-foreground/30' : 'text-accent-700'"
        >
          {{ appellation.holding }}
        </span>
      </a>
    </div>

    <p
      v-if="!appellations.length"
      class="border-b border-border py-3 text-sm text-foreground/[0.55]"
    >
      No appellations catalogued for this region yet.
    </p>
  </section>
</template>
