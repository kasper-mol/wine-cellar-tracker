<script setup lang="ts">
import { onMounted, reactive, computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'

import { useVintageRatingsStore } from '@/stores/vintageRatings'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import AddVintageRatingSourceDialog from '@/components/vintageRatings/AddVintageRatingSourceDialog.vue'

import EditVintageRatingDialog from '@/components/vintageRatings/EditVintageRatingDialog.vue'

const router = useRouter()

const vintageRatingsStore = useVintageRatingsStore()
const regionsStore = useWineRegionsStore()
const appellationsStore = useWineAppellationsStore()

const { ratings, sources } = storeToRefs(vintageRatingsStore)
const { regions } = storeToRefs(regionsStore)
const { appellations } = storeToRefs(appellationsStore)
const showAddSource = ref(false)

const filters = reactive({
  source_id: null as string | null,
  region_id: null as string | null,
  appellation_id: null as string | null,
  year: null as number | null,
})

const selectedRatingId = ref<string | null>(null)

const hasRatings = computed(() => ratings.value.length > 0)

watch(filters, () => {
  vintageRatingsStore.fetchRatings({
    source_id: filters.source_id ?? undefined,
    region_id: filters.region_id ?? undefined,
    appellation_id: filters.appellation_id ?? undefined,
    year: filters.year ?? undefined,
  })
})

onMounted(async () => {
  await Promise.all([
    vintageRatingsStore.fetchSources(),
    regionsStore.loadAll(),
    appellationsStore.loadAll(),
    vintageRatingsStore.fetchRatings(),
  ])
})

function openEditDialog(id: string) {
  selectedRatingId.value = id
}

function closeEditDialog() {
  selectedRatingId.value = null
}

function goToBatchAdd() {
  router.push('/manage/vintage-ratings/batch')
}

function clearFilters() {
  filters.source_id = null
  filters.region_id = null
  filters.appellation_id = null
  filters.year = null
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle>Vintage ratings</CardTitle>
          <CardDescription> Manage vintage ratings per region or appellation </CardDescription>
        </div>

        <div class="flex items-center gap-2">
          <Button variant="outline" @click="showAddSource = true"> + Add source </Button>

          <Button @click="goToBatchAdd"> + Batch add ratings </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <!-- Filters -->
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Select v-model="filters.source_id">
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="source in sources" :key="source.id" :value="source.id">
              {{ source.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="filters.region_id">
          <SelectTrigger>
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="region in regions" :key="region.id" :value="region.id">
              {{ region.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select v-model="filters.appellation_id">
          <SelectTrigger>
            <SelectValue placeholder="Appellation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="app in appellations" :key="app.id" :value="app.id">
              {{ app.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Input type="number" placeholder="Year" v-model.number="filters.year" />

        <Button variant="secondary" @click="clearFilters"> Clear </Button>
      </div>

      <!-- Table -->
      <div v-if="hasRatings">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Maturity</TableHead>
              <TableHead>Drink window</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-for="rating in ratings" :key="rating.id">
              <TableCell>{{ rating.year }}</TableCell>
              <TableCell>
                {{ rating.rating }}
                <span v-if="rating.structure_flags?.length">
                  ({{ rating.structure_flags.join(', ') }})
                </span>
              </TableCell>
              <TableCell>
                {{ sources.find((s) => s.id === rating.source_id)?.name }}
              </TableCell>
              <TableCell>
                <span v-if="rating.appellation_id"> Appellation </span>
                <span v-else> Region </span>
              </TableCell>
              <TableCell>{{ rating.maturity ?? '—' }}</TableCell>
              <TableCell>
                <span v-if="rating.drink_from || rating.drink_until">
                  {{ rating.drink_from ?? '—' }} – {{ rating.drink_until ?? '—' }}
                </span>
                <span v-else>—</span>
              </TableCell>
              <TableCell class="text-right">
                <Button size="sm" variant="outline" @click="openEditDialog(rating.id)">
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div v-else class="text-sm text-muted-foreground">No vintage ratings found.</div>
    </CardContent>
  </Card>

  <EditVintageRatingDialog
    v-if="selectedRatingId"
    :rating-id="selectedRatingId"
    @close="closeEditDialog"
  />
  <AddVintageRatingSourceDialog v-if="showAddSource" @close="showAddSource = false" />
</template>
