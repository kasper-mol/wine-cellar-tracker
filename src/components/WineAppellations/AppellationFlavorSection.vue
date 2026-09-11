<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { clusterLabel, flavorLevelCopy } from '@/content/flavorLevels'
import { buildFlavorProfile } from '@/lib/flavorProfile'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import type { AppellationFlavorRecord } from '@/types/appellationFlavors'

const props = defineProps<{
  rows: AppellationFlavorRecord[]
  loading: boolean
}>()

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { clustersWithDescriptors } = storeToRefs(flavorDescriptorsStore)

const profile = computed(() => buildFlavorProfile(props.rows, clustersWithDescriptors.value))
</script>

<template>
  <section v-if="loading || profile.length" class="mt-8">
    <div class="mb-3 flex items-baseline justify-between border-b border-border pb-2">
      <h2 class="font-heading text-[30px] font-normal">Typical aromas &amp; flavours</h2>
      <RouterLink to="/flavors" class="text-[11px] uppercase tracking-[0.12em] text-accent-700">
        WSET lexicon
      </RouterLink>
    </div>

    <div v-if="loading && !profile.length" class="space-y-2">
      <span v-for="row in 3" :key="row" class="block h-4 w-full bg-foreground/[0.06]" />
    </div>

    <div
      v-for="entry in profile"
      :key="entry.style"
      class="grid grid-cols-[150px_1fr] gap-4 border-b border-border py-3 max-md:grid-cols-1"
    >
      <div>
        <p class="text-[10px] uppercase tracking-[0.12em] text-foreground/[0.52]">
          {{ wineStyleLabel(entry.style) }}
        </p>
        <p class="num text-[11px] text-foreground/40">{{ entry.count }} descriptors</p>
      </div>

      <dl class="m-0">
        <div
          v-for="level in entry.levels"
          :key="level.level"
          class="mb-2 grid grid-cols-[90px_1fr] gap-3 last:mb-0 max-md:grid-cols-1 max-md:gap-0.5"
        >
          <dt class="text-xs font-semibold uppercase tracking-[0.12em] text-accent-700">
            {{ flavorLevelCopy(level.level).title }}
          </dt>
          <dd class="m-0 text-sm leading-[1.7] text-foreground/80">
            <template v-for="(group, index) in level.clusters" :key="group.cluster.id">
              <span class="text-foreground/[0.5]">{{ clusterLabel(group.cluster) }}: </span>
              <span>{{ group.descriptors.map((d) => d.name).join(', ') }}</span>
              <span v-if="index < level.clusters.length - 1" class="text-foreground/40">
                &nbsp;·&nbsp;
              </span>
            </template>
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
