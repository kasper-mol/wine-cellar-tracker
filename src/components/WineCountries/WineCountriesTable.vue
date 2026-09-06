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
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'

const emit = defineEmits<{
  (e: 'editCountry', id: string): void
  (e: 'deleteCountry', id: string): void
}>()

const wineCountriesStore = useWineCountriesStore()
const wineRegionsStore = useWineRegionsStore()
const { countries } = storeToRefs(wineCountriesStore)
const { regions } = storeToRefs(wineRegionsStore)

const regionCount = computed(() => {
  const map = new Map<string, number>()
  for (const region of regions.value) {
    map.set(region.country_id, (map.get(region.country_id) ?? 0) + 1)
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
        <TableHead class="w-[100px]">Code</TableHead>
        <TableHead class="w-[120px] text-right">Regions</TableHead>
        <TableHead class="w-[120px]">Created</TableHead>
        <TableHead class="w-[150px]" />
      </TableRow>
    </TableHeader>
    <TableBody v-if="countries.length">
      <TableRow v-for="(country, index) in countries" :key="country.id">
        <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
        <TableCell class="font-semibold">{{ country.name }}</TableCell>
        <TableCell class="text-[13px] text-foreground/[0.62]">{{ country.code || '—' }}</TableCell>
        <TableCell class="num text-right">{{ regionCount.get(country.id) ?? 0 }}</TableCell>
        <TableCell class="num text-[13px] text-foreground/[0.55]">
          {{ formatAdminDate(country.created_at) }}
        </TableCell>
        <TableCell>
          <span class="flex justify-end gap-1">
            <Button variant="ghost" size="sm" @click.stop="emit('editCountry', country.id)">
              Edit
            </Button>
            <Button variant="destructive" size="sm" @click.stop="emit('deleteCountry', country.id)">
              Delete
            </Button>
          </span>
        </TableCell>
      </TableRow>
    </TableBody>
    <TableBody v-else>
      <TableRow class="hover:bg-transparent">
        <TableCell colspan="6" class="py-3 text-sm text-foreground/[0.55]">
          No countries yet. Add your first entry.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
</template>
