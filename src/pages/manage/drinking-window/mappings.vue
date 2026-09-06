<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { useDrinkingWindowStore } from '@/stores/drinkingWindow'
import { fetchWineCountries } from '@/services/wineCountries'
import { fetchRegionsByCountry } from '@/services/wineRegions'
import { fetchAppellationsByRegion, fetchAppellationsByCountry } from '@/services/wineAppellations'
import type { WineCountryRecord } from '@/types/wineCountries'
import type { WineRegionRecord } from '@/types/wineRegions'
import type { WineAppellationRecord } from '@/types/wineAppellations'

const dwStore = useDrinkingWindowStore()
const { archetypes, mappings } = storeToRefs(dwStore)
const { feedback, setError } = useFeedback()

const NONE = '__none__'

// --- Lazy-loaded data ---
const countries = ref<WineCountryRecord[]>([])
const regions = ref<Pick<WineRegionRecord, 'id' | 'name' | 'country_id'>[]>([])
const appellations = ref<Pick<WineAppellationRecord, 'id' | 'name' | 'region_id' | 'region'>[]>([])

// --- Filters ---
const selectedCountryId = ref<string | null>(null)
const selectedRegionId = ref<string | null>(null)
const appellationSearch = ref('')
const regionSearch = ref('')
const unmappedOnly = ref(false)
const loadingRegions = ref(false)
const loadingAppellations = ref(false)

onMounted(async () => {
  try {
    // Only load config (small) + country list (small) upfront
    await Promise.all([
      dwStore.loadConfig(),
      fetchWineCountries().then((c) => (countries.value = c)),
    ])
  } catch (e) {
    setError(e, 'Failed to load.')
  }
})

// When country changes: reload regions + appellations
watch(selectedCountryId, async (countryId) => {
  selectedRegionId.value = null
  appellationSearch.value = ''
  regionSearch.value = ''
  regions.value = []
  appellations.value = []
  if (!countryId) return

  loadingRegions.value = true
  loadingAppellations.value = true
  try {
    const [r, a] = await Promise.all([
      fetchRegionsByCountry(countryId),
      fetchAppellationsByCountry(countryId),
    ])
    regions.value = r
    appellations.value = a
  } catch (e) {
    setError(e, 'Failed to load regions/appellations.')
  } finally {
    loadingRegions.value = false
    loadingAppellations.value = false
  }
})

// When region changes: reload appellations for that region only
watch(selectedRegionId, async (regionId) => {
  appellationSearch.value = ''
  appellations.value = []
  if (!regionId) {
    // Back to country level — reload all appellations for the country
    if (selectedCountryId.value) {
      loadingAppellations.value = true
      try {
        appellations.value = await fetchAppellationsByCountry(selectedCountryId.value)
      } catch (e) {
        setError(e, 'Failed to load appellations.')
      } finally {
        loadingAppellations.value = false
      }
    }
    return
  }
  loadingAppellations.value = true
  try {
    appellations.value = await fetchAppellationsByRegion(regionId)
  } catch (e) {
    setError(e, 'Failed to load appellations.')
  } finally {
    loadingAppellations.value = false
  }
})

// --- Filtered lists ---
const filteredAppellations = computed(() => {
  let list = appellations.value
  const q = appellationSearch.value.trim().toLowerCase()
  if (q) list = list.filter((a) => a.name.toLowerCase().includes(q))
  if (unmappedOnly.value) list = list.filter((a) => appellationArchetype(a.id) === NONE)
  return list
})

const filteredRegions = computed(() => {
  let list = regions.value
  const q = regionSearch.value.trim().toLowerCase()
  if (q) list = list.filter((r) => r.name.toLowerCase().includes(q))
  if (unmappedOnly.value) list = list.filter((r) => regionArchetype(r.id) === NONE)
  return list
})

// --- Stats for selected country ---
const mappedAppellationCount = computed(
  () => appellations.value.filter((a) => appellationArchetype(a.id) !== NONE).length,
)
const mappedRegionCount = computed(
  () => regions.value.filter((r) => regionArchetype(r.id) !== NONE).length,
)

// --- Mapping helpers ---
function appellationArchetype(id: string): string {
  return mappings.value.find((m) => m.appellation_id === id)?.archetype_id ?? NONE
}
function regionArchetype(id: string): string {
  return mappings.value.find((m) => m.region_id === id)?.archetype_id ?? NONE
}

async function onAssignAppellation(appellationId: string, value: string) {
  try {
    await dwStore.assignAppellation(appellationId, value === NONE ? null : value)
  } catch (e) {
    setError(e, 'Failed to set mapping.')
  }
}
async function onAssignRegion(regionId: string, value: string) {
  try {
    await dwStore.assignRegion(regionId, value === NONE ? null : value)
  } catch (e) {
    setError(e, 'Failed to set mapping.')
  }
}

function clearFilters() {
  selectedCountryId.value = null
  selectedRegionId.value = null
  appellationSearch.value = ''
  regionSearch.value = ''
  unmappedOnly.value = false
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <RouterLink
        to="/manage/drinking-window"
        class="text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft class="inline h-4 w-4" /> Drinking-window engine
      </RouterLink>
    </div>

    <div>
      <h1 class="text-3xl font-semibold tracking-tight">Archetype mappings</h1>
      <p class="mt-1 text-muted-foreground">
        Every wine needs an archetype to get a computed window. Resolution order:
        <strong>appellation</strong> → <strong>region fallback</strong> → no window. Select a
        country to start editing.
      </p>
    </div>

    <FeedbackBanner :feedback="feedback" />

    <!-- Country picker -->
    <Card>
      <CardHeader>
        <CardTitle>Select country</CardTitle>
        <CardDescription>Appellations and regions load on demand per country.</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="c in countries"
            :key="c.id"
            type="button"
            class="rounded-full border px-3 py-1 text-sm transition"
            :class="
              selectedCountryId === c.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background hover:bg-muted'
            "
            @click="selectedCountryId = selectedCountryId === c.id ? null : c.id"
          >
            {{ c.name }}
          </button>
        </div>

        <!-- Region sub-filter -->
        <div v-if="regions.length > 0">
          <p class="mb-2 text-sm font-medium text-muted-foreground">Filter by region</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="r in regions"
              :key="r.id"
              type="button"
              class="rounded-full border px-3 py-1 text-sm transition"
              :class="
                selectedRegionId === r.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted'
              "
              @click="selectedRegionId = selectedRegionId === r.id ? null : r.id"
            >
              {{ r.name }}
            </button>
          </div>
        </div>

        <!-- Unmapped only + clear -->
        <div v-if="selectedCountryId" class="flex flex-wrap items-center gap-3">
          <label class="flex cursor-pointer items-center gap-2 text-sm">
            <input v-model="unmappedOnly" type="checkbox" class="rounded border-input" />
            Show unmapped only
          </label>
          <Button
            v-if="selectedRegionId || unmappedOnly"
            variant="ghost"
            size="sm"
            @click="
              selectedRegionId = null;
              unmappedOnly = false;
              appellationSearch = '';
              regionSearch = '';
            "
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Placeholder when nothing selected -->
    <div
      v-if="!selectedCountryId"
      class="border-y border-border py-3 text-sm text-foreground/[0.55]"
    >
      Select a country above to load its appellations and regions.
    </div>

    <template v-else>
      <!-- Loading indicator -->
      <div
        v-if="loadingAppellations || loadingRegions"
        class="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 class="h-4 w-4 animate-spin" /> Loading…
      </div>

      <template v-else>
        <!-- Appellations -->
        <Card>
          <CardHeader>
            <CardTitle>Appellations</CardTitle>
            <CardDescription>
              {{ mappedAppellationCount }}/{{ appellations.length }} mapped in current view.
              Appellation mapping takes priority over region fallback.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Input
              v-model="appellationSearch"
              placeholder="Search appellations…"
              class="max-w-sm"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Appellation</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Archetype</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="app in filteredAppellations" :key="app.id">
                  <TableCell class="font-medium">{{ app.name }}</TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ (app.region as any)?.name ?? '—' }}
                  </TableCell>
                  <TableCell>
                    <Select
                      :model-value="appellationArchetype(app.id)"
                      @update:model-value="onAssignAppellation(app.id, $event as string)"
                    >
                      <SelectTrigger class="w-56"
                        ><SelectValue placeholder="— None —"
                      /></SelectTrigger>
                      <SelectContent>
                        <SelectItem :value="NONE">— None —</SelectItem>
                        <SelectItem v-for="a in archetypes" :key="a.id" :value="a.id">
                          {{ a.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
                <TableRow v-if="filteredAppellations.length === 0">
                  <TableCell colspan="3" class="text-center text-muted-foreground">
                    No appellations match the current filters.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <!-- Regions -->
        <Card>
          <CardHeader>
            <CardTitle>
              Regions
              <span class="text-base font-normal text-muted-foreground">(fallback)</span>
            </CardTitle>
            <CardDescription>
              {{ mappedRegionCount }}/{{ regions.length }} mapped in current view. Used when no
              appellation mapping exists.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-3">
            <Input v-model="regionSearch" placeholder="Search regions…" class="max-w-sm" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead>Archetype</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="region in filteredRegions" :key="region.id">
                  <TableCell class="font-medium">{{ region.name }}</TableCell>
                  <TableCell>
                    <Select
                      :model-value="regionArchetype(region.id)"
                      @update:model-value="onAssignRegion(region.id, $event as string)"
                    >
                      <SelectTrigger class="w-56"
                        ><SelectValue placeholder="— None —"
                      /></SelectTrigger>
                      <SelectContent>
                        <SelectItem :value="NONE">— None —</SelectItem>
                        <SelectItem v-for="a in archetypes" :key="a.id" :value="a.id">
                          {{ a.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
                <TableRow v-if="filteredRegions.length === 0">
                  <TableCell colspan="2" class="text-center text-muted-foreground">
                    No regions match the current filters.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </template>
    </template>
  </div>
</template>
