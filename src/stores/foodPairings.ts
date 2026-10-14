import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { until } from '@vueuse/core'
import { buildPhraseIndex, matchFoodTags } from '@/lib/foodTagMatcher'
import type { FoodTagMatch } from '@/lib/foodTagMatcher'
import { buildEditorialIndex } from '@/lib/foodPairingEditorial'
import { aggregateUnmatchedQueries } from '@/lib/foodSearchBacklog'
import {
  compareAppellationResults,
  groupByDrivingTags,
  scoreAppellations,
  scoreCellarWines,
  winesNeedingStyle,
} from '@/lib/foodPairingScorer'
import type { AppellationPairingResult, CellarWineMatch } from '@/lib/foodPairingScorer'
import {
  createAppellationFoodPairing,
  createDishPreset,
  createFoodTag,
  deleteAppellationFoodPairing,
  deleteDishPreset,
  deleteFoodSearchQueries,
  deleteFoodTag,
  deleteWineStyleFoodPairing,
  fetchAppellationFoodPairings,
  fetchAppellationFoodPairingsForTags,
  fetchDishPresets,
  fetchFoodSearchQueries,
  fetchFoodTags,
  fetchWineStyleFoodPairings,
  logFoodSearchQuery,
  replaceDishPresetTags,
  updateDishPreset,
  updateFoodTag,
  upsertWineStyleFoodPairing,
} from '@/services/foodPairings'
import { fetchUserWines } from '@/services/wines'
import { useAuthStore } from '@/stores/auth'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type {
  AppellationFoodPairingCreatePayload,
  AppellationFoodPairingRecord,
  DishPresetCreatePayload,
  DishPresetRecord,
  DishPresetUpdatePayload,
  FoodSearchQueryRecord,
  FoodTagCreatePayload,
  FoodTagRecord,
  FoodTagUpdatePayload,
  WineStyleFoodPairingRecord,
  WineStyleFoodPairingUpsertPayload,
} from '@/types/foodPairings'
import type { WineRecord } from '@/types/wines'

export const useFoodPairingsStore = defineStore('foodPairings', () => {
  /* --- vocabulary: loaded once, kept for the session --- */
  const tags = ref<FoodTagRecord[]>([])
  const wineStyleFoodPairings = ref<WineStyleFoodPairingRecord[]>([])
  const dishPresets = ref<DishPresetRecord[]>([])
  const vocabularyLoaded = ref(false)
  let vocabularyPromise: Promise<void> | null = null

  /** Rebuilt only when the vocabulary array itself is replaced. */
  const phraseIndex = computed(() => buildPhraseIndex(tags.value))

  /** What each appellation's own classic pairings mention — the per-appellation signal that
   *  lifts an appellation known for a dish above one that merely shares its wine style. Lazy:
   *  built by the first search, and again only when the catalogue or vocabulary changes. */
  const editorialIndex = computed(() =>
    buildEditorialIndex(useWineAppellationsStore().allAppellations, tags.value, phraseIndex.value),
  )

  /* --- current search --- */
  const isSearching = ref(false)
  const hasSearched = ref(false)
  const lastQuery = ref('')
  const searchError = ref<string | null>(null)
  const currentMatches = ref<FoodTagMatch[]>([])
  /** The FULL, unfiltered scoreAppellations output — what scoreCellarWines reads. */
  const appellationResults = ref<AppellationPairingResult[]>([])
  const cellarResults = ref<CellarWineMatch[]>([])
  /** Cellar bottles left out only because they have no style on a multi-style appellation. */
  const cellarNeedingStyle = ref<WineRecord[]>([])
  let searchToken = 0

  /** "Appellations to try": a derived view, so a display cap never touches cellar matching.
   *  Switched-off appellations are scored (a bottle on one still needs its result) but never suggested. */
  const appellationsToShow = computed(() => {
    const shown = new Set(useWineAppellationsStore().appellations.map((a) => a.id))
    return appellationResults.value
      .filter((r) => r.score > 0 && shown.has(r.appellation.id))
      .sort(compareAppellationResults)
  })
  const appellationGroups = computed(() =>
    groupByDrivingTags(appellationsToShow.value, currentMatches.value),
  )
  const cellarGroups = computed(() => groupByDrivingTags(cellarResults.value, currentMatches.value))

  /* --- admin: unmatched-search backlog --- */
  const searchQueries = ref<FoodSearchQueryRecord[]>([])
  const searchQueriesLoading = ref(false)
  /** Zero-match queries the CURRENT vocabulary still can't match — self-cleaning as tags grow. */
  const unmatchedQueries = computed(() =>
    aggregateUnmatchedQueries(searchQueries.value, tags.value, phraseIndex.value),
  )

  /* --- per-appellation overrides, for the admin editor and the detail page --- */
  const byAppellation = ref<Record<string, AppellationFoodPairingRecord[]>>({})
  const loading = ref<Record<string, boolean>>({})

  /** One shared, awaitable load: concurrent callers reuse the same in-flight promise. */
  function loadVocabulary(): Promise<void> {
    if (vocabularyLoaded.value) return Promise.resolve()
    if (!vocabularyPromise) {
      vocabularyPromise = Promise.all([
        fetchFoodTags(),
        fetchWineStyleFoodPairings(),
        // Presets are sugar: the feature works with none, so a failure here mustn't block search.
        fetchDishPresets().catch(() => [] as DishPresetRecord[]),
      ])
        .then(([tagRows, styleRows, presetRows]) => {
          tags.value = tagRows
          wineStyleFoodPairings.value = styleRows
          dishPresets.value = presetRows
          vocabularyLoaded.value = true
        })
        .finally(() => {
          vocabularyPromise = null
        })
    }
    return vocabularyPromise
  }

  let appellationsReadyPromise: Promise<unknown> | null = null

  /** Shared by the page's eager prefetch and every search, so concurrent callers never
   *  trigger a duplicate fetch, and a search always awaits the SAME promise a prefetch
   *  may already have started. A direct visit to /pairing can't assume the dashboard
   *  loaded the catalogue; scoring against an empty one would be a silent false negative. */
  function ensureAppellationsLoaded(): Promise<unknown> {
    const wineAppellationsStore = useWineAppellationsStore()
    if (wineAppellationsStore.allAppellations.length > 0) return Promise.resolve()
    if (!appellationsReadyPromise) {
      appellationsReadyPromise = wineAppellationsStore.loadAll().finally(() => {
        appellationsReadyPromise = null
      })
    }
    return appellationsReadyPromise
  }

  /** The user's bottles, fresh from the DB as raw `WineRecord`s (nullable `style`) —
   *  never the display-oriented `UserWine` in the main store, which defaults a missing
   *  style to 'red'. Waits for auth to settle so a direct visit doesn't read an empty cellar. */
  async function fetchCellarWines(): Promise<WineRecord[]> {
    const authStore = useAuthStore()
    await until(() => !authStore.isLoading).toBe(true, { timeout: 5000 })
    if (!authStore.isLoggedIn) return []
    return fetchUserWines()
  }

  function resetResults() {
    currentMatches.value = []
    appellationResults.value = []
    cellarResults.value = []
    cellarNeedingStyle.value = []
  }

  /** Shared tail of search() and searchByTags(). Only the latest call may commit. */
  async function scoreMatches(matches: FoodTagMatch[], token: number) {
    if (!matches.length) {
      currentMatches.value = []
      resetResults()
      return
    }

    const [overrides, wines] = await Promise.all([
      fetchAppellationFoodPairingsForTags(matches.map((m) => m.tag.id)),
      fetchCellarWines(),
    ])
    if (token !== searchToken) return

    // Everything the caller can read, switched-off ones included: scoreCellarWines looks a bottle's
    // appellation up in this set, and only appellationsToShow filters what is suggested.
    const appellations = useWineAppellationsStore().allAppellations
    const scored = scoreAppellations(
      appellations,
      matches,
      wineStyleFoodPairings.value,
      overrides,
      editorialIndex.value,
    )

    currentMatches.value = matches
    appellationResults.value = scored
    cellarResults.value = scoreCellarWines(wines, matches, scored, wineStyleFoodPairings.value)
    cellarNeedingStyle.value = winesNeedingStyle(wines, scored)
  }

  async function runSearch(
    lastQueryText: string,
    resolveMatches: () => FoodTagMatch[],
    logQuery: boolean,
  ) {
    const token = ++searchToken
    isSearching.value = true
    searchError.value = null
    lastQuery.value = lastQueryText
    try {
      // Both loads are awaited here, not assumed: a search must never run against an
      // empty vocabulary or an empty appellation catalogue, however the page was reached.
      await Promise.all([loadVocabulary(), ensureAppellationsLoaded()])
      if (token !== searchToken) return

      const matches = resolveMatches()
      if (logQuery) {
        logFoodSearchQuery({
          raw_query: lastQueryText,
          matched_tag_ids: matches.map((m) => m.tag.id),
          matched_count: matches.length,
          user_id: useAuthStore().user?.id ?? null,
        })
      }
      await scoreMatches(matches, token)
      if (token === searchToken) hasSearched.value = true
    } catch (error) {
      if (token === searchToken) {
        searchError.value = error instanceof Error ? error.message : 'Search failed.'
      }
    } finally {
      if (token === searchToken) isSearching.value = false
    }
  }

  /** Free-text path: phrase + fuzzy matching over the in-memory vocabulary. */
  function search(input: string) {
    const query = input.trim()
    if (!query) {
      clearSearch()
      return Promise.resolve()
    }
    return runSearch(query, () => matchFoodTags(query, tags.value, phraseIndex.value), true)
  }

  /** Select path: a direct selection is just a match with confidence 1 and no parsing. */
  function searchByTags(tagIds: string[]) {
    if (!tagIds.length) {
      clearSearch()
      return Promise.resolve()
    }
    return runSearch(
      '',
      () =>
        tagIds
          .map((id) => tags.value.find((tag) => tag.id === id))
          .filter((tag): tag is FoodTagRecord => !!tag)
          .map((tag) => ({ tag, matchedPhrase: tag.name, confidence: 1 })),
      false,
    )
  }

  function clearSearch() {
    searchToken++ // orphan anything still in flight
    isSearching.value = false
    hasSearched.value = false
    searchError.value = null
    lastQuery.value = ''
    resetResults()
  }

  /* --- admin: vocabulary editing. Mutates the same cached state the pairing page reads,
   *     so an edit shows up there immediately. --- */

  /** Same order the DB query pins (sort_order, then id): the matcher's tie-breaks rely on it. */
  function sortTags(list: FoodTagRecord[]) {
    return [...list].sort(
      (a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
  }

  function sortPresets(list: DishPresetRecord[]) {
    return [...list].sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
  }

  async function addTag(payload: FoodTagCreatePayload) {
    const created = await createFoodTag(payload)
    tags.value = sortTags([...tags.value, created])
    return created
  }

  async function saveTag(id: string, payload: FoodTagUpdatePayload) {
    const updated = await updateFoodTag(id, payload)
    tags.value = sortTags(tags.value.map((tag) => (tag.id === id ? updated : tag)))
    return updated
  }

  /** The DB cascades to baseline rows, overrides and preset links; mirror that locally. */
  async function removeTag(id: string) {
    await deleteFoodTag(id)
    tags.value = tags.value.filter((tag) => tag.id !== id)
    wineStyleFoodPairings.value = wineStyleFoodPairings.value.filter(
      (row) => row.food_tag_id !== id,
    )
    dishPresets.value = dishPresets.value.map((preset) => ({
      ...preset,
      foodTagIds: preset.foodTagIds.filter((tagId) => tagId !== id),
    }))
    for (const [appellationId, rows] of Object.entries(byAppellation.value)) {
      byAppellation.value[appellationId] = rows.filter((row) => row.food_tag_id !== id)
    }
  }

  async function saveBaseline(payload: WineStyleFoodPairingUpsertPayload) {
    const saved = await upsertWineStyleFoodPairing(payload)
    wineStyleFoodPairings.value = [
      ...wineStyleFoodPairings.value.filter(
        (row) => !(row.wine_style === saved.wine_style && row.food_tag_id === saved.food_tag_id),
      ),
      saved,
    ]
    return saved
  }

  async function removeBaseline(row: WineStyleFoodPairingRecord) {
    await deleteWineStyleFoodPairing(row.id)
    wineStyleFoodPairings.value = wineStyleFoodPairings.value.filter((r) => r.id !== row.id)
  }

  async function addPreset(payload: DishPresetCreatePayload) {
    const created = await createDishPreset(payload)
    const preset: DishPresetRecord = { ...created, foodTagIds: [] }
    dishPresets.value = sortPresets([...dishPresets.value, preset])
    return preset
  }

  async function savePreset(id: string, payload: DishPresetUpdatePayload) {
    const updated = await updateDishPreset(id, payload)
    dishPresets.value = sortPresets(
      dishPresets.value.map((preset) =>
        preset.id === id ? { ...updated, foodTagIds: preset.foodTagIds } : preset,
      ),
    )
    return updated
  }

  async function setPresetTags(id: string, tagIds: string[]) {
    await replaceDishPresetTags(id, tagIds)
    const unique = [...new Set(tagIds)]
    dishPresets.value = dishPresets.value.map((preset) =>
      preset.id === id ? { ...preset, foodTagIds: unique } : preset,
    )
  }

  async function removePreset(id: string) {
    await deleteDishPreset(id)
    dishPresets.value = dishPresets.value.filter((preset) => preset.id !== id)
  }

  async function loadSearchQueries() {
    searchQueriesLoading.value = true
    try {
      searchQueries.value = await fetchFoodSearchQueries()
    } finally {
      searchQueriesLoading.value = false
    }
  }

  async function dismissSearchQueries(ids: string[]) {
    await deleteFoodSearchQueries(ids)
    const gone = new Set(ids)
    searchQueries.value = searchQueries.value.filter((row) => !gone.has(row.id))
  }

  /* --- override CRUD, keyed by appellation like the flavour store --- */
  function forAppellation(appellationId: string): AppellationFoodPairingRecord[] {
    return byAppellation.value[appellationId] ?? []
  }

  async function fetchForAppellation(appellationId: string) {
    if (!appellationId) return
    loading.value[appellationId] = true
    try {
      byAppellation.value[appellationId] = await fetchAppellationFoodPairings(appellationId)
    } finally {
      loading.value[appellationId] = false
    }
  }

  async function add(payload: AppellationFoodPairingCreatePayload) {
    const created = await createAppellationFoodPairing(payload)
    const list = byAppellation.value[payload.appellation_id] ?? []
    byAppellation.value[payload.appellation_id] = [...list, created]
    return created
  }

  async function remove(record: AppellationFoodPairingRecord) {
    await deleteAppellationFoodPairing(record.id)
    const list = byAppellation.value[record.appellation_id] ?? []
    byAppellation.value[record.appellation_id] = list.filter((row) => row.id !== record.id)
  }

  return {
    tags,
    phraseIndex,
    wineStyleFoodPairings,
    dishPresets,
    vocabularyLoaded,
    isSearching,
    hasSearched,
    lastQuery,
    searchError,
    currentMatches,
    appellationResults,
    cellarResults,
    cellarNeedingStyle,
    appellationsToShow,
    appellationGroups,
    cellarGroups,
    byAppellation,
    loading,
    searchQueries,
    searchQueriesLoading,
    unmatchedQueries,
    loadVocabulary,
    ensureAppellationsLoaded,
    search,
    searchByTags,
    clearSearch,
    addTag,
    saveTag,
    removeTag,
    saveBaseline,
    removeBaseline,
    addPreset,
    savePreset,
    setPresetTags,
    removePreset,
    loadSearchQueries,
    dismissSearchQueries,
    forAppellation,
    fetchForAppellation,
    add,
    remove,
  }
})
