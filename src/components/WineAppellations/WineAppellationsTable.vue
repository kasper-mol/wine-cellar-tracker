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
import { Button } from '@/components/ui/button'
import { formatAdminDate } from '@/lib/format'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

const emit = defineEmits<{
  (e: 'editAppellation', id: string): void
  (e: 'deleteAppellation', id: string): void
}>()

const wineAppellationsStore = useWineAppellationsStore()
const { appellations } = storeToRefs(wineAppellationsStore)
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead>Name</TableHead>
        <TableHead class="w-[220px]">Region</TableHead>
        <TableHead class="w-[110px] text-right">Grape rules</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="appellations.length">
      <TableRow v-for="(app, index) in appellations" :key="app.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold">{{ app.name }}</TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">
          {{
            app.region
              ? `${app.region.name}${app.region.country?.name ? ` · ${app.region.country.name}` : ''}`
              : '—'
          }}
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
        <TableCell colspan="6" class="py-3 text-sm text-foreground/[0.55]">
          No appellations yet. Add one to get started.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
