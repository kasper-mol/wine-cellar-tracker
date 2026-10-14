<script setup lang="ts">
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
import { isAppellationVisible } from '@/lib/visibility'
import { useWineRegionsStore } from '@/stores/wineRegions'
import type { WineAppellationRecord } from '@/types/wineAppellations'

defineProps<{
  /** The rows to list: the page applies its country/region filter before passing them in. */
  appellations: WineAppellationRecord[]
  /** A filter is on, so an empty list means "no match" rather than "no appellations yet". */
  filtered?: boolean
  /** Appellation whose Active toggle is mid-save. */
  pendingId?: string | null
}>()

const emit = defineEmits<{
  (e: 'editAppellation', id: string): void
  (e: 'deleteAppellation', id: string): void
  (e: 'toggleActive', id: string, value: boolean): void
}>()

const wineRegionsStore = useWineRegionsStore()
// The manage portal sees inactive entries too.
const { allRegions } = storeToRefs(wineRegionsStore)

/** On its own flag, but hidden because the region is switched off. */
function hiddenByRegion(app: WineAppellationRecord) {
  if (!app.is_active) return false
  return !isAppellationVisible(
    app,
    allRegions.value.find((r) => r.id === app.region_id),
  )
}
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead>Name</TableHead>
        <TableHead class="w-[220px]">Region</TableHead>
        <TableHead class="w-[80px]">Active</TableHead>
        <TableHead class="w-[110px] text-right">Grape rules</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="appellations.length">
      <TableRow v-for="(app, index) in appellations" :key="app.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell
          :class="[
            'font-semibold',
            (!app.is_active || hiddenByRegion(app)) && 'text-foreground/[0.5]',
          ]"
        >
          {{ app.name }}
          <Badge v-if="!app.is_active" variant="secondary" class="ml-2 align-middle font-normal">
            Inactive
          </Badge>
          <Badge
            v-else-if="hiddenByRegion(app)"
            variant="secondary"
            class="ml-2 align-middle font-normal"
          >
            Hidden · region inactive
          </Badge>
        </TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">
          {{
            app.region
              ? `${app.region.name}${app.region.country?.name ? ` · ${app.region.country.name}` : ''}`
              : '—'
          }}
        </TableCell>
        <TableCell>
          <Checkbox
            :model-value="app.is_active"
            :disabled="pendingId === app.id"
            :aria-label="`${app.name} is active`"
            @update:model-value="emit('toggleActive', app.id, $event === true)"
          />
        </TableCell>
        <TableCell class="num text-right">{{ app.grapes?.length ?? 0 }}</TableCell>
        <TableCell class="num text-[13px] text-foreground/[0.55]">
          {{ formatAdminDate(app.created_at) }}
        </TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button variant="ghost" size="sm" @click.stop="emit('editAppellation', app.id)">
              Edit
            </Button>
            <Button variant="destructive" size="sm" @click.stop="emit('deleteAppellation', app.id)">
              Delete
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="7" class="py-3 text-sm text-foreground/[0.55]">
          {{
            filtered
              ? 'No appellations match this filter.'
              : 'No appellations yet. Add one to get started.'
          }}
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
