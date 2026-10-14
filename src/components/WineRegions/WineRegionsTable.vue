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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatAdminDate } from '@/lib/format'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type { WineRegionRecord } from '@/types/wineRegions'

defineProps<{
  /** The rows to list: the page applies its country filter before passing them in. */
  regions: WineRegionRecord[]
  /** A filter is on, so an empty list means "no match" rather than "no regions yet". */
  filtered?: boolean
  /** Region whose Active toggle is mid-save. */
  pendingId?: string | null
}>()

const emit = defineEmits<{
  (e: 'editRegion', id: string): void
  (e: 'deleteRegion', id: string): void
  (e: 'toggleActive', id: string, value: boolean): void
}>()

const wineAppellationsStore = useWineAppellationsStore()
// The manage portal sees inactive entries too.
const { allAppellations: appellations } = storeToRefs(wineAppellationsStore)

const appellationCount = computed(() => {
  const map = new Map<string, { total: number; active: number }>()
  for (const appellation of appellations.value) {
    const count = map.get(appellation.region_id) ?? { total: 0, active: 0 }
    count.total += 1
    if (appellation.is_active) count.active += 1
    map.set(appellation.region_id, count)
  }
  return map
})

/** "5", or "3 of 5" when some are switched off on their own. */
function appellationLabel(regionId: string) {
  const count = appellationCount.value.get(regionId)
  if (!count) return '0'
  return count.active === count.total ? String(count.total) : `${count.active} of ${count.total}`
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead>Name</TableHead>
        <TableHead class="w-[140px]">Country</TableHead>
        <TableHead class="w-[80px]">Active</TableHead>
        <TableHead class="w-[120px] text-right">Appellations</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="regions.length">
      <TableRow v-for="(region, index) in regions" :key="region.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell :class="['font-semibold', !region.is_active && 'text-foreground/[0.5]']">
          {{ region.name }}
          <Badge v-if="!region.is_active" variant="secondary" class="ml-2 align-middle font-normal">
            Inactive
          </Badge>
        </TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">
          {{ region.country?.name || '—' }}
        </TableCell>
        <TableCell>
          <Checkbox
            :model-value="region.is_active"
            :disabled="pendingId === region.id"
            :aria-label="`${region.name} is active`"
            @update:model-value="emit('toggleActive', region.id, $event === true)"
          />
        </TableCell>
        <TableCell class="num text-right">{{ appellationLabel(region.id) }}</TableCell>
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
        <TableCell colspan="7" class="py-3 text-sm text-foreground/[0.55]">
          {{ filtered ? 'No regions match this filter.' : 'No regions yet. Add your first entry.' }}
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
