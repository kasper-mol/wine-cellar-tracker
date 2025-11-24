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
import { useWineCountriesStore } from '@/stores/wineCountries'

const emit = defineEmits<{
  (e: 'editCountry', id: string): void
  (e: 'deleteCountry', id: string): void
}>()

const wineCountriesStore = useWineCountriesStore()
const { countries } = storeToRefs(wineCountriesStore)

const hasCountries = computed(() => countries.value.length > 0)
</script>
<template>
  <Card>
    <CardHeader>
      <CardTitle>Available countries</CardTitle>
      <CardDescription>
        Click a row to select it for editing or remove it from the table.
      </CardDescription>
    </CardHeader>
    <CardContent class="p-0">
      <div class="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-[45%]">Name</TableHead>
              <TableHead class="w-[20%]">Code</TableHead>
              <TableHead class="w-[20%]">Created</TableHead>
              <TableHead class="w-[15%]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="hasCountries">
            <TableRow v-for="country in countries" :key="country.id">
              <TableCell class="font-medium">{{ country.name }}</TableCell>
              <TableCell>{{ country.code || '—' }}</TableCell>
              <TableCell>
                {{ new Date(country.created_at).toLocaleDateString() }}
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-muted-foreground"
                    @click.stop="emit('editCountry', country.id)"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="text-destructive hover:text-destructive"
                    @click.stop="emit('deleteCountry', country.id)"
                  >
                    {{ 'Delete' }}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow>
              <TableCell colspan="4">
                <div class="p-6 text-center text-sm text-muted-foreground">
                  {{ 'No countries yet. Add your first entry.' }}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
    <CardFooter>
      <p class="text-sm text-muted-foreground">
        Showing {{ countries.length }} countr{{ countries.length === 1 ? 'y' : 'ies' }} from
        Supabase.
      </p>
    </CardFooter>
  </Card>
</template>
