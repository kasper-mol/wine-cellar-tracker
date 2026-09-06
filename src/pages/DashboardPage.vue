<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Plus, Trash2, Wine } from 'lucide-vue-next'
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
import { Input } from '@/components/ui/input'
import { Seg, SegOption } from '@/components/ui/seg'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import CellarLedger from '@/components/wines/CellarLedger.vue'
import DrinkBottleDialog from '@/components/wines/DrinkBottleDialog.vue'
import DrinkingWindowChart from '@/components/wines/DrinkingWindowChart.vue'
import type { TimelineRow } from '@/components/wines/DrinkingWindowChart.vue'
import InventoryPlates from '@/components/wines/InventoryPlates.vue'
import PhaseMark from '@/components/wines/PhaseMark.vue'
import ReadyThisSeason from '@/components/wines/ReadyThisSeason.vue'
import { formatPrice, formatWindow, lineValue } from '@/lib/cellar'
import type { CellarEntry } from '@/lib/cellar'
import { numberToWords, numberToWordsCapitalized } from '@/lib/numberToWords'
import { CONFIDENCE_TITLE, READY_PHASES } from '@/lib/phase'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { useMainStore } from '@/stores/main'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineRegionsStore } from '@/stores/wineRegions'
import { useFeedback } from '@/composables/useFeedback'
import type { UserWine } from '@/types/wines'

const router = useRouter()
const mainStore = useMainStore()
const wineRegionsStore = useWineRegionsStore()
const wineCountriesStore = useWineCountriesStore()
const wineAppellationsStore = useWineAppellationsStore()
const drinkingWindowStore = useDrinkingWindowStore()
const { userWines, isLoading } = storeToRefs(mainStore)
const { regions } = storeToRefs(wineRegionsStore)
const { countries } = storeToRefs(wineCountriesStore)
const { feedback, setSuccess, setError } = useFeedback()

const drinkRef = ref<InstanceType<typeof DrinkBottleDialog> | null>(null)
const confirmRef = ref<InstanceType<typeof ConfirmDialog> | null>(null)

/** The engine config has to be in hand before any window can be computed. */
const configReady = ref(false)

const inventoryView = useLocalStorage<'table' | 'plates'>('cellartracker:inventoryView', 'table')
const windowChartOpen = useLocalStorage('cellartracker:windowChartOpen', true)

onMounted(async () => {
  wineRegionsStore.loadAll()
  wineCountriesStore.loadAll()
  wineAppellationsStore.loadAll()
  await drinkingWindowStore.loadConfig()
  configReady.value = true
})

/* ------------------------------ derived ------------------------------ */

const entries = computed<CellarEntry[]>(() =>
  userWines.value.map((wine) => ({
    wine,
    window: configReady.value ? drinkingWindowStore.computeWindow(wine) : null,
  })),
)

const readyEntries = computed(() =>
  entries.value
    .filter(
      (entry) =>
        entry.wine.quantity > 0 && entry.window && READY_PHASES.includes(entry.window.phaseNow),
    )
    .sort((a, b) => (a.window?.drinkBy ?? 0) - (b.window?.drinkBy ?? 0)),
)

const readyBottles = computed(() =>
  readyEntries.value.reduce((sum, entry) => sum + entry.wine.quantity, 0),
)

const readySummary = computed(() => {
  if (!readyEntries.value.length) return null
  const labels = readyEntries.value.length
  return (
    `${numberToWordsCapitalized(labels)} label${labels === 1 ? '' : 's'} at or past peak — ` +
    `${numberToWords(readyBottles.value)} bottle${readyBottles.value === 1 ? '' : 's'}`
  )
})

const earliestOpening = computed(() => {
  const currentYear = new Date().getFullYear()
  const years = entries.value
    .map((entry) => entry.window?.enter)
    .filter((year): year is number => typeof year === 'number' && year > currentYear)
  return years.length ? Math.min(...years) : null
})

const timelineRows = computed<TimelineRow[]>(() =>
  entries.value
    .filter((entry) => entry.window !== null)
    .map((entry) => ({
      id: entry.wine.id,
      name: entry.wine.name,
      vintage: entry.wine.vintage,
      enter: entry.window!.enter,
      drinkBy: entry.window!.drinkBy,
      phase: entry.window!.phaseNow,
    })),
)

const unmappedCount = computed(() => entries.value.filter((entry) => entry.window === null).length)

const countryCodeByRegion = computed(() => {
  const countryById = new Map(countries.value.map((country) => [country.id, country]))
  return new Map(
    regions.value.map((region) => [
      region.id,
      region.country?.code ?? countryById.get(region.country_id)?.code ?? null,
    ]),
  )
})

function countryCode(wine: UserWine) {
  return wine.regionId ? (countryCodeByRegion.value.get(wine.regionId) ?? null) : null
}

const totalBottles = computed(() => mainStore.totalBottleCount)
const uniqueLabels = computed(() => new Set(userWines.value.map((wine) => wine.name)).size)

const tableCaption = computed(
  () =>
    `${numberToWordsCapitalized(uniqueLabels.value)} label${uniqueLabels.value === 1 ? '' : 's'} · ` +
    `${numberToWords(totalBottles.value)} bottle${totalBottles.value === 1 ? '' : 's'}. ` +
    'Click a column head to sort.',
)

/* --- Search + sort (client-side over the already-loaded cellar) --- */
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
      return lineValue(a) - lineValue(b)
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

const visibleEntries = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  let list = entries.value
  if (query) {
    list = list.filter((entry) =>
      [
        entry.wine.name,
        entry.wine.producer,
        entry.wine.appellationName,
        entry.wine.regionName,
      ].some((field) => field?.toLowerCase().includes(query)),
    )
  }

  if (sortKey.value) {
    const direction = sortDir.value === 'asc' ? 1 : -1
    const key = sortKey.value
    list = [...list].sort((a, b) => compareWines(a.wine, b.wine, key) * direction)
  }

  return list
})

/* ------------------------------ actions ------------------------------ */

function openCreate() {
  router.push({ name: 'wine-create' })
}

function openEdit(wine: UserWine) {
  router.push({ name: 'wine-edit', params: { id: wine.id } })
}

function openDrink(wine: UserWine) {
  drinkRef.value?.open(wine)
}

async function handleDelete(wine: UserWine) {
  const label = `${wine.name}${wine.vintage ? ` ${wine.vintage}` : ''}`
  const confirmed = await confirmRef.value?.confirm({
    title: 'Remove from the cellar',
    body: `“${label}” and its holding will be removed. This cannot be undone.`,
  })
  if (!confirmed) return

  try {
    await mainStore.removeWine(wine.id)
    setSuccess(`Removed “${wine.name}”.`)
  } catch (error) {
    setError(error, 'Failed to remove wine.')
  }
}
</script>

<template>
  <div>
    <FeedbackBanner :feedback="feedback" class="mb-6" />

    <CellarLedger :wines="userWines" :ready-bottles="readyBottles" />
    <div class="rule-dbl mb-8" />

    <ReadyThisSeason
      :entries="readyEntries.slice(0, 4)"
      :summary="readySummary"
      :earliest-opening="earliestOpening"
      @drink="openDrink($event.wine)"
    />

    <DrinkingWindowChart
      v-model:open="windowChartOpen"
      :rows="timelineRows"
      :unmapped-count="unmappedCount"
    />

    <section>
      <div class="mb-4 flex flex-wrap items-baseline gap-3">
        <span class="num font-heading text-[13px] tracking-[0.16em] text-primary">III.</span>
        <h2 class="font-heading text-[34px] font-normal">The inventory</h2>
        <div class="ml-auto flex flex-wrap items-center gap-3">
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Search label, producer, appellation…"
            class="w-[290px]"
            aria-label="Search wines"
          />
          <Seg v-model="inventoryView" name="inventory-view">
            <SegOption value="table">Table</SegOption>
            <SegOption value="plates">Plates</SegOption>
          </Seg>
          <Button @click="openCreate">
            <Plus class="h-3.5 w-3.5" :stroke-width="1.5" />
            Add wine
          </Button>
        </div>
      </div>

      <div v-if="isLoading" class="border-t border-border">
        <div v-for="row in 6" :key="`skeleton-${row}`" class="border-b border-border py-2">
          <span class="block h-4 w-full bg-foreground/[0.06]" />
        </div>
      </div>

      <template v-else-if="inventoryView === 'table'">
        <Table>
          <TableCaption>{{ tableCaption }}</TableCaption>
          <TableHeader>
            <TableRow class="hover:bg-transparent">
              <TableHead class="w-[34px] text-right">№</TableHead>
              <TableHead>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 hover:text-foreground"
                  @click="toggleSort('name')"
                >
                  Label
                  <component
                    :is="sortIcon('name')"
                    class="h-3 w-3"
                    :stroke-width="1.5"
                    :class="sortKey === 'name' ? 'text-foreground' : 'text-foreground/40'"
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
                  Origin
                  <component
                    :is="sortIcon('location')"
                    class="h-3 w-3"
                    :stroke-width="1.5"
                    :class="sortKey === 'location' ? 'text-foreground' : 'text-foreground/40'"
                  />
                </button>
              </TableHead>
              <TableHead class="w-[70px] text-right">
                <button
                  type="button"
                  class="ml-auto flex items-center gap-1 hover:text-foreground"
                  @click="toggleSort('vintage')"
                >
                  Vintage
                  <component
                    :is="sortIcon('vintage')"
                    class="h-3 w-3"
                    :stroke-width="1.5"
                    :class="sortKey === 'vintage' ? 'text-foreground' : 'text-foreground/40'"
                  />
                </button>
              </TableHead>
              <TableHead class="w-[210px]">Window</TableHead>
              <TableHead class="w-[64px] text-right">Btl</TableHead>
              <TableHead class="w-[88px] text-right">
                <button
                  type="button"
                  class="ml-auto flex items-center gap-1 hover:text-foreground"
                  @click="toggleSort('value')"
                >
                  Value
                  <component
                    :is="sortIcon('value')"
                    class="h-3 w-3"
                    :stroke-width="1.5"
                    :class="sortKey === 'value' ? 'text-foreground' : 'text-foreground/40'"
                  />
                </button>
              </TableHead>
              <TableHead class="w-[96px]" />
            </TableRow>
          </TableHeader>
          <TableBody v-if="visibleEntries.length">
            <TableRow
              v-for="(entry, index) in visibleEntries"
              :key="entry.wine.id"
              :class="entry.wine.quantity === 0 && 'opacity-45'"
            >
              <TableCell class="num text-right text-xs text-foreground/40">
                {{ index + 1 }}
              </TableCell>
              <TableCell>
                <span class="flex flex-col">
                  <span class="font-semibold">{{ entry.wine.name }}</span>
                  <span v-if="entry.wine.producer" class="text-xs italic text-foreground/[0.58]">
                    {{ entry.wine.producer }}
                  </span>
                </span>
              </TableCell>
              <TableCell>
                <span class="flex flex-col">
                  <RouterLink
                    v-if="entry.wine.appellationId"
                    :to="{ name: 'appellation-detail', params: { id: entry.wine.appellationId } }"
                    class="text-[13px] text-accent-700 hover:underline"
                  >
                    {{ entry.wine.appellationName }}
                  </RouterLink>
                  <span v-else class="text-[13px] text-foreground/40">—</span>
                  <span class="text-xs text-foreground/[0.52]">
                    <RouterLink
                      v-if="entry.wine.regionId"
                      :to="{ name: 'region-detail', params: { id: entry.wine.regionId } }"
                      class="hover:underline"
                    >
                      {{ entry.wine.regionName }}
                    </RouterLink>
                    <template v-else>{{ entry.wine.regionName || '—' }}</template>
                    <template v-if="countryCode(entry.wine)"
                      >, {{ countryCode(entry.wine) }}</template
                    >
                  </span>
                </span>
              </TableCell>
              <TableCell class="num text-right">{{ entry.wine.vintage || 'NV' }}</TableCell>
              <TableCell>
                <span
                  v-if="entry.window"
                  class="flex flex-col gap-[3px]"
                  :class="entry.window.confidence === 'Low' && 'opacity-60'"
                >
                  <PhaseMark :phase="entry.window.phaseNow" />
                  <span class="num text-xs text-foreground/[0.52]">
                    {{ formatWindow(entry.window) }}
                    <span
                      class="cursor-help opacity-65"
                      :title="CONFIDENCE_TITLE[entry.window.confidence]"
                    >
                      ±{{ entry.window.uncertaintyYears }}y · {{ entry.window.confidence }}
                    </span>
                  </span>
                </span>
                <RouterLink
                  v-else
                  to="/manage/drinking-window"
                  class="text-xs text-foreground/50 underline decoration-dotted"
                  title="No archetype mapped for this wine's appellation/region"
                >
                  Needs mapping
                </RouterLink>
              </TableCell>
              <TableCell class="num text-right">{{ entry.wine.quantity }}</TableCell>
              <TableCell class="num text-right">
                {{ formatPrice(lineValue(entry.wine)) }}
              </TableCell>
              <TableCell>
                <span class="flex justify-end gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Open a bottle"
                    :disabled="entry.wine.quantity === 0"
                    @click="openDrink(entry.wine)"
                  >
                    <Wine class="h-[15px] w-[15px]" :stroke-width="1.5" />
                    <span class="sr-only">Open a bottle of {{ entry.wine.name }}</span>
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit" @click="openEdit(entry.wine)">
                    <Pencil class="h-[15px] w-[15px]" :stroke-width="1.5" />
                    <span class="sr-only">Edit {{ entry.wine.name }}</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    title="Remove"
                    @click="handleDelete(entry.wine)"
                  >
                    <Trash2 class="h-[15px] w-[15px]" :stroke-width="1.5" />
                    <span class="sr-only">Remove {{ entry.wine.name }}</span>
                  </Button>
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
          <TableBody v-else>
            <TableRow class="hover:bg-transparent">
              <TableCell colspan="8" class="py-3 text-sm text-foreground/[0.55]">
                <template v-if="userWines.length"> No wines match “{{ searchQuery }}”. </template>
                <template v-else>
                  The cellar is empty — add a bottle to begin the ledger.
                </template>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </template>

      <template v-else>
        <InventoryPlates v-if="visibleEntries.length" :entries="visibleEntries" />
        <p v-else class="border-y border-border py-3 text-sm text-foreground/[0.55]">
          <template v-if="userWines.length">No wines match “{{ searchQuery }}”.</template>
          <template v-else>The cellar is empty — add a bottle to begin the ledger.</template>
        </p>
      </template>
    </section>

    <DrinkBottleDialog ref="drinkRef" @saved="setSuccess" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>
