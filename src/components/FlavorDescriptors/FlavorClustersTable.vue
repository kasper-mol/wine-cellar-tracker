<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { clusterLabel } from '@/content/flavorLevels'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import type { FlavorClusterWithDescriptors } from '@/types/flavorDescriptors'

const emit = defineEmits<{
  (e: 'editCluster', cluster: FlavorClusterWithDescriptors): void
}>()

const flavorDescriptorsStore = useFlavorDescriptorsStore()
const { clustersWithDescriptors } = storeToRefs(flavorDescriptorsStore)

const hasClusters = computed(() => clustersWithDescriptors.value.length > 0)

function preview(cluster: FlavorClusterWithDescriptors) {
  const names = cluster.descriptors.map((d) => d.name)
  return names.length > 6 ? `${names.slice(0, 6).join(', ')}…` : names.join(', ')
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead class="w-[120px]">Level</TableHead>
        <TableHead class="w-[220px]">Cluster</TableHead>
        <TableHead>Descriptors</TableHead>
        <TableHead class="w-[70px] text-right">Count</TableHead>
        <TableHead class="w-[100px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="hasClusters">
      <TableRow v-for="(cluster, index) in clustersWithDescriptors" :key="cluster.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold capitalize">{{ cluster.level }}</TableCell>
        <TableCell>
          <span class="block">{{ clusterLabel(cluster) }}</span>
          <span v-if="cluster.description" class="block text-[11px] italic text-foreground/50">
            {{ cluster.description }}
          </span>
        </TableCell>
        <TableCell class="text-[13px] text-foreground/[0.74]">{{ preview(cluster) }}</TableCell>
        <TableCell class="num text-right">{{ cluster.descriptors.length }}</TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button variant="ghost" size="sm" @click.stop="emit('editCluster', cluster)">
              Edit
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="6" class="py-3 text-sm text-foreground/[0.55]">
          No flavour clusters yet. Add your first cluster.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
