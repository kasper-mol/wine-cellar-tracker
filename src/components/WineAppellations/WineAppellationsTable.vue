<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
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
import { useWineAppellationsStore } from '@/stores/wineAppellations'

const emit = defineEmits<{
  (e: 'editAppellation', id: string): void
  (e: 'deleteAppellation', id: string): void
}>()

const wineAppellationsStore = useWineAppellationsStore()
const { appellations } = storeToRefs(wineAppellationsStore)

const hasAppellations = computed(() => appellations.value.length > 0)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Appellations</CardTitle>
      <CardDescription> Click a row to edit or remove an appellation. </CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div class="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[40%]">Name</TableHead>
              <TableHead class="w-[35%]">Region</TableHead>
              <TableHead class="w-[15%]">Created</TableHead>
              <TableHead class="w-[10%]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="hasAppellations">
            <TableRow v-for="app in appellations" :key="app.id">
              <TableCell class="font-medium">{{ app.name }}</TableCell>
              <TableCell>
                {{
                  app.region
                    ? `${app.region.name}${app.region.country?.name ? ` • ${app.region.country.name}` : ''}`
                    : '—'
                }}
              </TableCell>
              <TableCell>{{ new Date(app.created_at).toLocaleDateString() }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" @click.stop="emit('editAppellation', app.id)">
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click.stop="emit('deleteAppellation', app.id)"
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
                  No appellations yet. Add one to get started.
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter>
      <p class="text-sm text-muted-foreground">
        Showing {{ appellations.length }} appellation{{ appellations.length === 1 ? '' : 's' }}.
      </p>
    </CardFooter>
  </Card>
</template>
