<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatAdminDate } from '@/lib/format'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineRegionsStore } from '@/stores/wineRegions'

const emit = defineEmits<{
  (e: 'editRegion', id: string): void
  (e: 'deleteRegion', id: string): void
}>()

const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const { regions } = storeToRefs(wineRegionsStore)
const { appellations } = storeToRefs(wineAppellationsStore)

const appellationCount = computed(() => {
  const map = new Map<string, number>()
  for (const appellation of appellations.value) {
    map.set(appellation.region_id, (map.get(appellation.region_id) ?? 0) + 1)
  }
  return map
})
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead>Name</TableHead>
        <TableHead class="w-[140px]">Country</TableHead>
        <TableHead class="w-[120px] text-right">Appellations</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="regions.length">
      <TableRow v-for="(region, index) in regions" :key="region.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold">{{ region.name }}</TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">
          {{ region.country?.name || '—' }}
        </TableCell>
        <TableCell class="num text-right">{{ appellationCount.get(region.id) ?? 0 }}</TableCell>
        <TableCell class="num text-[13px] text-foreground/[0.55]">
          {{ formatAdminDate(region.created_at) }}
        </TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button variant="ghost" size="sm" @click.stop="emit('editRegion', region.id)">
              Edit
            </Button>
            <Button variant="destructive" size="sm" @click.stop="emit('deleteRegion', region.id)">
              Delete
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="6" class="py-3 text-sm text-foreground/[0.55]">
          No regions yet. Add your first entry.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
