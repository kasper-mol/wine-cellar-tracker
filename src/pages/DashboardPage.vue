<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Pencil,
  Trash2,
  Plus,
  Wine,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-vue-next'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import WineFormDialog from '@/components/wines/WineFormDialog.vue'
import DrinkBottleDialog from '@/components/wines/DrinkBottleDialog.vue'
import DrinkingWindowStatus from '@/components/wines/DrinkingWindowStatus.vue'
import { useMainStore } from '@/stores/main'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useFeedback } from '@/composables/useFeedback'
import type { UserWine } from '@/types/wines'

const mainStore = useMainStore()
const wineRegionsStore = useWineRegionsStore()
const wineAppellationsStore = useWineAppellationsStore()
const drinkingWindowStore = useDrinkingWindowStore()
const { userWines } = storeToRefs(mainStore)
const { feedback, setSuccess, setError } = useFeedback()

const formRef = ref<InstanceType<typeof WineFormDialog> | null>(null)
const drinkRef = ref<InstanceType<typeof DrinkBottleDialog> | null>(null)

onMounted(() => {
  // needed to populate the region/appellation pickers in the form
  wineRegionsStore.loadAll()
  wineAppellationsStore.loadAll()
  // config + vintage ratings for the computed drinking windows
  drinkingWindowStore.loadConfig()
})

function openCreate() {
  formRef.value?.open()
}

function openEdit(wine: UserWine) {
  formRef.value?.open(wine)
}

function openDrink(wine: UserWine) {
  drinkRef.value?.open(wine)
}

async function handleDelete(wine: UserWine) {
  const label = `${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}`
  if (!window.confirm(`Remove “${label}” from your cellar? This cannot be undone.`)) return
  try {
    await mainStore.removeWine(wine.id)
    setSuccess(`Removed “${wine.name}”.`)
  } catch (error) {
    setError(error, 'Failed to remove wine.')
  }
}

const totalBottles = computed(() => mainStore.totalBottleCount)
const uniqueLabels = computed(() => new Set(userWines.value.map((wine) => wine.name)).size)
const cellarValue = computed(() =>
  userWines.value.reduce((sum, wine) => sum + wine.purchasePrice * wine.quantity, 0),
)

// --- Search + sort (client-side over the already-loaded cellar) ---
type SortKey = 'name' | 'location' | 'vintage' | 'value'

const searchQuery = ref('')
const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return ChevronsUpDown
  return sortDir.value === 'asc' ? ArrowUp : ArrowDown
}

function compareWines(a: UserWine, b: UserWine, key: SortKey): number {
  switch (key) {
    case 'name':
      return a.name.localeCompare(b.name)
    case 'vintage':
      return a.vintage - b.vintage
    case 'value':
      return a.purchasePrice * a.quantity - b.purchasePrice * b.quantity
    case 'location':
      // region first, then appellation as a tie-breaker
      return (
        a.regionName.localeCompare(b.regionName) ||
        a.appellationName.localeCompare(b.appellationName)
      )
    default:
      return 0
  }
}

const visibleWines = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  let list = userWines.value
  if (query) {
    list = list.filter((wine) =>
      [wine.name, wine.producer, wine.appellationName, wine.regionName].some((field) =>
        field?.toLowerCase().includes(query),
      ),
    )
  }

  if (sortKey.value) {
    const direction = sortDir.value === 'asc' ? 1 : -1
    const key = sortKey.value
    list = [...list].sort((a, b) => compareWines(a, b, key) * direction)
  }

  return list
})

function clearFilters() {
  searchQuery.value = ''
  sortKey.value = null
  sortDir.value = 'asc'
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
})

function formatPrice(value: number) {
  return currencyFormatter.format(value)
}
</script>

<template>
  <div class="space-y-8">
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Your digital cellar</p>
        <h1 class="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p class="text-muted-foreground">Monitor your collection at a glance.</p>
      </div>
      <div class="flex items-center gap-3">
        <p class="text-sm text-muted-foreground">
          Tracking {{ userWines.length }} wine{{ userWines.length === 1 ? '' : 's' }}.
        </p>
        <Button @click="openCreate"> <Plus class="mr-1 h-4 w-4" /> Add wine </Button>
      </div>
    </section>

    <FeedbackBanner :feedback="feedback" />

    <section class="grid gap-4 md:grid-cols-3">
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Total bottles</p>
        <p class="text-3xl font-semibold">{{ totalBottles }}</p>
      </div>
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Unique labels</p>
        <p class="text-3xl font-semibold">{{ uniqueLabels }}</p>
      </div>
      <div class="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <p class="text-sm text-muted-foreground">Cellar value</p>
        <p class="text-3xl font-semibold">{{ formatPrice(cellarValue) }}</p>
      </div>
    </section>

    <section class="space-y-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-sm">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">Your wines</h2>
          <p class="text-sm text-muted-foreground">
            <template v-if="searchQuery.trim()">
              Showing {{ visibleWines.length }} of {{ userWines.length }} wines.
            </template>
            <template v-else>
              {{ userWines.length }} wine{{ userWines.length === 1 ? '' : 's' }} in your cellar.
            </template>
          </p>
        </div>
        <div class="relative w-full sm:w-72">
          <Search
            class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search label, producer, region…"
            class="pl-8 pr-8"
            aria-label="Search wines"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
      </div>

      <Table>
        <TableCaption>Click a column header to sort.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[240px]">
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-foreground"
                @click="toggleSort('name')"
              >
                Label
                <component
                  :is="sortIcon('name')"
                  class="h-3.5 w-3.5"
                  :class="sortKey === 'name' ? 'text-foreground' : 'text-muted-foreground/40'"
                />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-foreground"
                title="Sort by region, then appellation"
                @click="toggleSort('location')"
              >
                Appellation / Region
                <component
                  :is="sortIcon('location')"
                  class="h-3.5 w-3.5"
                  :class="sortKey === 'location' ? 'text-foreground' : 'text-muted-foreground/40'"
                />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                class="inline-flex items-center gap-1 hover:text-foreground"
                @click="toggleSort('vintage')"
              >
                Vintage
                <component
                  :is="sortIcon('vintage')"
                  class="h-3.5 w-3.5"
                  :class="sortKey === 'vintage' ? 'text-foreground' : 'text-muted-foreground/40'"
                />
              </button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Qty</TableHead>
            <TableHead class="text-right">
              <button
                type="button"
                class="ml-auto flex items-center gap-1 hover:text-foreground"
                @click="toggleSort('value')"
              >
                Value
                <component
                  :is="sortIcon('value')"
                  class="h-3.5 w-3.5"
                  :class="sortKey === 'value' ? 'text-foreground' : 'text-muted-foreground/40'"
                />
              </button>
            </TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody v-if="visibleWines.length">
          <TableRow
            v-for="wine in visibleWines"
            :key="wine.id"
            :class="wine.quantity === 0 && 'opacity-50'"
          >
            <TableCell>
              <div class="flex flex-col">
                <span class="font-medium">{{ wine.name }}</span>
                <span class="text-sm text-muted-foreground">{{ wine.producer }}</span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex flex-col">
                <RouterLink
                  v-if="wine.appellationId"
                  :to="{ name: 'appellation-detail', params: { id: wine.appellationId } }"
                  class="font-medium text-primary hover:underline"
                >
                  {{ wine.appellationName }}
                </RouterLink>
                <span v-else class="font-medium text-muted-foreground">—</span>
                <RouterLink
                  v-if="wine.regionId"
                  :to="{ name: 'region-detail', params: { id: wine.regionId } }"
                  class="text-sm text-muted-foreground hover:underline"
                >
                  {{ wine.regionName }}
                </RouterLink>
                <span v-else-if="wine.regionName" class="text-sm text-muted-foreground">
                  {{ wine.regionName }}
                </span>
              </div>
            </TableCell>
            <TableCell>{{ wine.vintage }}</TableCell>
            <TableCell>
              <Badge v-if="wine.quantity === 0" variant="secondary">Finished</Badge>
              <DrinkingWindowStatus v-else :wine="wine" />
            </TableCell>
            <TableCell class="text-right font-medium">{{ wine.quantity }}</TableCell>
            <TableCell class="text-right font-medium">
              {{ formatPrice(wine.purchasePrice) }}
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  class="h-8 w-8 p-0"
                  title="Drink a bottle"
                  :disabled="wine.quantity === 0"
                  @click="openDrink(wine)"
                >
                  <Wine class="h-4 w-4" />
                  <span class="sr-only">Drink a bottle of {{ wine.name }}</span>
                </Button>
                <Button variant="ghost" class="h-8 w-8 p-0" title="Edit" @click="openEdit(wine)">
                  <Pencil class="h-4 w-4" />
                  <span class="sr-only">Edit {{ wine.name }}</span>
                </Button>
                <Button
                  variant="ghost"
                  class="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Remove"
                  @click="handleDelete(wine)"
                >
                  <Trash2 class="h-4 w-4" />
                  <span class="sr-only">Remove {{ wine.name }}</span>
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
        <TableBody v-else>
          <TableRow>
            <TableCell colspan="7">
              <div
                v-if="userWines.length"
                class="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground"
              >
                <p>No wines match your filters.</p>
                <Button variant="outline" size="sm" @click="clearFilters">Clear filters</Button>
              </div>
              <div v-else class="py-6 text-center text-muted-foreground">
                No wines yet. Add a few to get started.
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </section>

    <WineFormDialog ref="formRef" @saved="setSuccess" />
    <DrinkBottleDialog ref="drinkRef" @saved="setSuccess" />
  </div>
</template>
