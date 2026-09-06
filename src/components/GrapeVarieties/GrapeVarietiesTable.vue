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
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'

const emit = defineEmits<{
  (e: 'editGrape', id: string): void
  (e: 'deleteGrape', id: string): void
}>()

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const { grapeVarieties } = storeToRefs(grapeVarietiesStore)
</script>

<template>
  <Table>
    <TableHeader>
      <TableRow class="hover:bg-transparent">
        <TableHead class="w-[34px] text-right">№</TableHead>
        <TableHead class="w-[220px]">Name</TableHead>
        <TableHead class="w-[110px]">Colour</TableHead>
        <TableHead>Description</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="grapeVarieties.length">
      <TableRow v-for="(grape, index) in grapeVarieties" :key="grape.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold">{{ grape.name }}</TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">{{ grape.color || '—' }}</TableCell>
        <TableCell
          class="max-w-xs truncate text-[13px] text-foreground/[0.74]"
          :title="grape.description || undefined"
        >
          {{ grape.description || '—' }}
        </TableCell>
        <TableCell class="num text-[13px] text-foreground/[0.55]">
          {{ formatAdminDate(grape.created_at) }}
        </TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button variant="ghost" size="sm" @click.stop="emit('editGrape', grape.id)">
              Edit
            </Button>
            <Button variant="destructive" size="sm" @click.stop="emit('deleteGrape', grape.id)">
              Delete
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="6" class="py-3 text-sm text-foreground/[0.55]">
          No grape varieties yet. Add your first entry.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
