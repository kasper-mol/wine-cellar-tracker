<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useWineRegionsStore } from '@/stores/wineRegions'

const emit = defineEmits<{
  (e: 'editRegion', id: string): void
  (e: 'deleteRegion', id: string): void
}>()

const wineRegionsStore = useWineRegionsStore()
const { regions } = storeToRefs(wineRegionsStore)

const hasRegions = computed(() => regions.value.length > 0)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Available regions</CardTitle>
      <CardDescription>
        Click a row to select it for editing or remove it from the table.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div class="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[40%]">Name</TableHead>
              <TableHead class="w-[30%]">Country</TableHead>
              <TableHead class="w-[20%]">Created</TableHead>
              <TableHead class="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="hasRegions">
            <TableRow v-for="region in regions" :key="region.id">
              <TableCell class="font-medium">{{ region.name }}</TableCell>
              <TableCell>{{ region.country?.name || '—' }}</TableCell>
              <TableCell>
                {{ new Date(region.created_at).toLocaleDateString() }}
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground"
                    @click.stop="emit('editRegion', region.id)"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click.stop="emit('deleteRegion', region.id)"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow>
              <TableCell colspan="4">
                <div class="p-6 text-center text-sm text-muted-foreground">
                  No regions yet. Add your first entry.
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter>
      <p class="text-sm text-muted-foreground">
        Showing {{ regions.length }} region{{ regions.length === 1 ? '' : 's' }} from Supabase.
      </p>
    </CardFooter>
  </Card>
</template>
