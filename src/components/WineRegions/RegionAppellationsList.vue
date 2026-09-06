<script setup lang="ts">
defineProps<{
  appellations: Array<{
    id: string
    name: string
  }>
}>()

const emit = defineEmits<{ (e: 'select-appellation', id: string): void }>()
</script>

<template>
  <section>
    <h2 class="mb-3 mt-6 font-heading text-[26px] font-normal">Appellations</h2>

    <div v-if="appellations.length" class="flex flex-wrap gap-1.5">
      <a
        v-for="appellation in appellations"
        :key="appellation.id"
        href="#"
        class="inline-flex items-center rounded-sm border border-primary px-2.5 py-[3px] text-[11px] tracking-[0.02em] text-primary transition-colors hover:bg-primary/[0.12]"
        @click.prevent="emit('select-appellation', appellation.id)"
      >
        {{ appellation.name }}
      </a>
    </div>

    <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No appellations catalogued for this region yet.
    </p>
  </section>
</template>
