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
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'

const emit = defineEmits<{
  (e: 'editGrape', id: string): void
  (e: 'deleteGrape', id: string): void
}>()

const grapeVarietiesStore = useWineGrapeVarietiesStore()
const { grapeVarieties } = storeToRefs(grapeVarietiesStore)

const hasGrapes = computed(() => grapeVarieties.value.length > 0)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Available grape varieties</CardTitle>
      <CardDescription>
        Click a row to select it for editing or remove it from the table.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div class="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[30%]">Name</TableHead>
              <TableHead class="w-[20%]">Color</TableHead>
              <TableHead class="w-[30%]">Description</TableHead>
              <TableHead class="w-[10%]">Created</TableHead>
              <TableHead class="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="hasGrapes">
            <TableRow v-for="grape in grapeVarieties" :key="grape.id">
              <TableCell class="font-medium">{{ grape.name }}</TableCell>
              <TableCell>{{ grape.color || '—' }}</TableCell>
              <TableCell class="max-w-xs truncate" :title="grape.description || undefined">
                {{ grape.description || '—' }}
              </TableCell>
              <TableCell>{{ new Date(grape.created_at).toLocaleDateString() }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground"
                    @click.stop="emit('editGrape', grape.id)"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click.stop="emit('deleteGrape', grape.id)"
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow>
              <TableCell colspan="5">
                <div class="p-6 text-center text-sm text-muted-foreground">
                  No grape varieties yet. Add your first entry.
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter>
      <p class="text-sm text-muted-foreground">
        Showing {{ grapeVarieties.length }} variet{{ grapeVarieties.length === 1 ? 'y' : 'ies' }}.
      </p>
    </CardFooter>
  </Card>
</template>
