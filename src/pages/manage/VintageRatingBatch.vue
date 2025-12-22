<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

import { useVintageRatingsStore } from '@/stores/vintageRatings'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'

const router = useRouter()

const vintageRatingsStore = useVintageRatingsStore()
const regionsStore = useWineRegionsStore()
const appellationsStore = useWineAppellationsStore()

const { sources } = storeToRefs(vintageRatingsStore)
const { regions } = storeToRefs(regionsStore)
const { appellations } = storeToRefs(appellationsStore)

const sourceId = ref<string | null>(null)
const regionId = ref<string | null>(null)
const appellationId = ref<string | null>(null)
const fromYear = ref<number | null>(null)
const toYear = ref<number | null>(null)

const rows = ref<
  {
    year: number
    rating: string
    maturity: string
    structure_flags: string[]
    drink_from: number | null
    drink_until: number | null
    description: string
  }[]
>([])

const canAddRows = computed(() => sourceId.value && (regionId.value || appellationId.value))

function addYearRange(start: number | null, end: number | null) {
  if (start === null || end === null) return
  const [begin, finish] = start <= end ? [start, end] : [end, start]

  for (let year = begin; year <= finish; year++) {
    if (!rows.value.find((r) => r.year === year)) {
      rows.value.push({
        year,
        rating: '',
        maturity: '',
        structure_flags: [],
        drink_from: null,
        drink_until: null,
        description: '',
      })
    }
  }
  rows.value.sort((a, b) => b.year - a.year)
}

function removeRow(year: number) {
  rows.value = rows.value.filter((r) => r.year !== year)
}

async function saveAll() {
  if (!canAddRows.value || !rows.value.length) return

  const result = await vintageRatingsStore.addRatingsBatch({
    source_id: sourceId.value!,
    region_id: regionId.value,
    appellation_id: appellationId.value,
    rows: rows.value.map((r) => ({
      year: r.year,
      rating: r.rating,
      maturity: r.maturity.trim() || null,
      structure_flags: r.structure_flags,
      drink_from: r.drink_from,
      drink_until: r.drink_until,
      description: r.description.trim() || null,
    })),
  })

  alert(`Created ${result.insertedCount} ratings, skipped ${result.skippedCount} existing`)

  router.push('/manage/vintage-ratings')
}

function clearTarget(type: 'region' | 'appellation') {
  if (type === 'region') appellationId.value = null
  if (type === 'appellation') regionId.value = null
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Batch add vintage ratings</CardTitle>
      <CardDescription>
        Create multiple vintage ratings at once (existing entries are skipped)
      </CardDescription>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Source & Target -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Source</Label>
          <Select v-model="sourceId">
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="source in sources" :key="source.id" :value="source.id">
                {{ source.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Region</Label>
          <Select v-model="regionId" @update:model-value="clearTarget('region')">
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="region in regions" :key="region.id" :value="region.id">
                {{ region.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Appellation</Label>
          <Select v-model="appellationId" @update:model-value="clearTarget('appellation')">
            <SelectTrigger>
              <SelectValue placeholder="Select appellation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="app in appellations" :key="app.id" :value="app.id">
                {{ app.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Year generator -->
      <div class="flex items-end gap-4">
        <div>
          <Label>From year</Label>
          <Input type="number" v-model.number="fromYear" />
        </div>
        <div>
          <Label>To year</Label>
          <Input type="number" v-model.number="toYear" />
        </div>
        <Button :disabled="!canAddRows" @click="addYearRange(fromYear, toYear)"> Add years </Button>
      </div>

      <!-- Table -->
      <div v-if="rows.length">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Drink window</TableHead>
              <TableHead>Description</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-for="row in rows" :key="row.year">
              <TableCell>{{ row.year }}</TableCell>
              <TableCell>
                <Input v-model="row.rating" />
              </TableCell>
              <TableCell>
                <Input v-model="row.maturity" />
              </TableCell>
              <TableCell>
                <Input
                  :model-value="row.structure_flags.join(', ')"
                  @update:model-value="
                    row.structure_flags = $event
                      .split(',')
                      .map((v) => v.trim())
                      .filter(Boolean)
                  "
                />
              </TableCell>
              <TableCell>
                <div class="flex gap-2">
                  <Input type="number" v-model.number="row.drink_from" />
                  <Input type="number" v-model.number="row.drink_until" />
                </div>
              </TableCell>
              <TableCell>
                <Textarea v-model="row.description" rows="2" />
              </TableCell>
              <TableCell>
                <Button size="sm" variant="ghost" @click="removeRow(row.year)"> ✕ </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div class="flex justify-end gap-2 mt-4">
          <Button variant="secondary" @click="router.back()"> Cancel </Button>
          <Button @click="saveAll"> Save all </Button>
        </div>
      </div>

      <div v-else class="text-sm text-muted-foreground">
        Add a year range to start entering ratings.
      </div>
    </CardContent>
  </Card>
</template>
