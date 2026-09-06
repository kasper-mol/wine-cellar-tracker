<script setup lang="ts">
import { onMounted, reactive, computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

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

import { Plus } from 'lucide-vue-next'
import { useVintageRatingsStore } from '@/stores/vintageRatings'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import AddVintageRatingSourceDialog from '@/components/vintageRatings/AddVintageRatingSourceDialog.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'

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
  <div>
    <ManageHeader
      title="Vintage ratings"
      note="Ratings are held per region or appellation and per source; the drinking-window engine reads them when it estimates a window."
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <Button variant="secondary" @click="showAddSource = true">Add source</Button>
          <Button @click="goToBatchAdd">
            <Plus class="h-3.5 w-3.5" :stroke-width="1.5" />
            Batch add ratings
          </Button>
        </div>
      </template>
    </ManageHeader>

    <ManageTabs />

    <div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-5">
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

      <Input v-model.number="filters.year" type="number" placeholder="Year" />

      <Button variant="secondary" @click="clearFilters">Clear</Button>
    </div>

    <Table v-if="hasRatings">
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead class="w-[34px] text-right">№</TableHead>
          <TableHead class="w-[74px] text-right">Year</TableHead>
          <TableHead class="w-[150px]">Rating</TableHead>
          <TableHead class="w-[160px]">Source</TableHead>
          <TableHead class="w-[110px]">Target</TableHead>
          <TableHead class="w-[150px]">Maturity</TableHead>
          <TableHead class="w-[150px]">Drink window</TableHead>
          <TableHead class="w-[100px]" />
        </TableRow>
      </TableHeader>

      <TableBody>
        <TableRow v-for="(rating, index) in ratings" :key="rating.id">
          <TableCell class="num text-right text-xs text-foreground/40">{{ index + 1 }}</TableCell>
          <TableCell class="num text-right font-heading text-[18px]">{{ rating.year }}</TableCell>
          <TableCell class="num">
            {{ rating.rating }}
            <span v-if="rating.structure_flags?.length" class="text-xs text-foreground/[0.55]">
              ({{ rating.structure_flags.join(', ') }})
            </span>
          </TableCell>
          <TableCell class="text-[13px] text-foreground/[0.62]">
            {{ sources.find((s) => s.id === rating.source_id)?.name }}
          </TableCell>
          <TableCell class="text-[13px] text-foreground/[0.62]">
            {{ rating.appellation_id ? 'Appellation' : 'Region' }}
          </TableCell>
          <TableCell class="text-[13px]">{{ rating.maturity ?? '—' }}</TableCell>
          <TableCell class="num text-[13px] text-foreground/[0.55]">
            <template v-if="rating.drink_from || rating.drink_until">
              {{ rating.drink_from ?? '—' }} – {{ rating.drink_until ?? '—' }}
            </template>
            <template v-else>—</template>
          </TableCell>
          <TableCell>
            <span class="flex justify-end">
              <Button variant="ghost" size="sm" @click="openEditDialog(rating.id)">Edit</Button>
            </span>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
      No vintage ratings found.
    </p>

    <EditVintageRatingDialog
      v-if="selectedRatingId"
      :rating-id="selectedRatingId"
      @close="closeEditDialog"
    />
    <AddVintageRatingSourceDialog v-if="showAddSource" @close="showAddSource = false" />
  </div>
</template>
