import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { appellation, baseline, tag, wine } from '@/lib/__tests__/fixtures'
import type { WineAppellationRecord } from '@/types/wineAppellations'
import type { WineRecord } from '@/types/wines'

const mocks = vi.hoisted(() => ({
  fetchWineAppellations: vi.fn(),
  fetchUserWines: vi.fn(),
  fetchFoodTags: vi.fn(),
  fetchWineStyleFoodPairings: vi.fn(),
  fetchDishPresets: vi.fn(),
  fetchAppellationFoodPairingsForTags: vi.fn(),
  logFoodSearchQuery: vi.fn(),
  createFoodTag: vi.fn(),
  updateFoodTag: vi.fn(),
  deleteFoodTag: vi.fn(),
  upsertWineStyleFoodPairing: vi.fn(),
  deleteWineStyleFoodPairing: vi.fn(),
  createDishPreset: vi.fn(),
  updateDishPreset: vi.fn(),
  deleteDishPreset: vi.fn(),
  replaceDishPresetTags: vi.fn(),
  fetchFoodSearchQueries: vi.fn(),
  deleteFoodSearchQueries: vi.fn(),
}))

vi.mock('@/services/wineAppellations', () => ({
  fetchWineAppellations: mocks.fetchWineAppellations,
  createWineAppellation: vi.fn(),
  updateWineAppellation: vi.fn(),
  deleteWineAppellation: vi.fn(),
}))
vi.mock('@/services/wines', () => ({ fetchUserWines: mocks.fetchUserWines }))
vi.mock('@/services/foodPairings', () => ({
  fetchFoodTags: mocks.fetchFoodTags,
  fetchWineStyleFoodPairings: mocks.fetchWineStyleFoodPairings,
  fetchDishPresets: mocks.fetchDishPresets,
  fetchAppellationFoodPairingsForTags: mocks.fetchAppellationFoodPairingsForTags,
  fetchAppellationFoodPairings: vi.fn(),
  createAppellationFoodPairing: vi.fn(),
  deleteAppellationFoodPairing: vi.fn(),
  logFoodSearchQuery: mocks.logFoodSearchQuery,
  createFoodTag: mocks.createFoodTag,
  updateFoodTag: mocks.updateFoodTag,
  deleteFoodTag: mocks.deleteFoodTag,
  upsertWineStyleFoodPairing: mocks.upsertWineStyleFoodPairing,
  deleteWineStyleFoodPairing: mocks.deleteWineStyleFoodPairing,
  createDishPreset: mocks.createDishPreset,
  updateDishPreset: mocks.updateDishPreset,
  deleteDishPreset: mocks.deleteDishPreset,
  replaceDishPresetTags: mocks.replaceDishPresetTags,
  fetchFoodSearchQueries: mocks.fetchFoodSearchQueries,
  deleteFoodSearchQueries: mocks.deleteFoodSearchQueries,
}))

const auth = reactive({ isLoading: false, isLoggedIn: true, user: { id: 'user-1' } })
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

// Imported after the mocks are registered.
const { useFoodPairingsStore } = await import('@/stores/foodPairings')

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const steak = tag('steak')
const catalogue = [
  appellation('barolo', ['red']),
  appellation('chablis', ['white']),
  appellation('pending', null),
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  auth.isLoading = false
  auth.isLoggedIn = true
  mocks.fetchWineAppellations.mockResolvedValue(catalogue)
  mocks.fetchFoodTags.mockResolvedValue([steak])
  mocks.fetchWineStyleFoodPairings.mockResolvedValue([baseline('red', 'steak', 2)])
  mocks.fetchDishPresets.mockResolvedValue([])
  mocks.fetchAppellationFoodPairingsForTags.mockResolvedValue([])
  mocks.fetchUserWines.mockResolvedValue([])
})

describe('useFoodPairingsStore.search', () => {
  it('scores against the full appellation catalogue even when called before the prefetch resolves', async () => {
    const catalogueFetch = deferred<WineAppellationRecord[]>()
    mocks.fetchWineAppellations.mockReturnValue(catalogueFetch.promise)
    const store = useFoodPairingsStore()

    // Page mount: eager prefetch, still in flight…
    void store.ensureAppellationsLoaded().catch(() => undefined)
    void store.loadVocabulary()
    // …and the user submits immediately (direct link / bookmark / refresh).
    const searching = store.search('steak')

    // Give the search every chance to run ahead of the catalogue: it must still be waiting.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(store.isSearching).toBe(true)
    expect(mocks.fetchAppellationFoodPairingsForTags).not.toHaveBeenCalled()

    catalogueFetch.resolve(catalogue)
    await searching

    // Two scoreable appellations (the pending one is skipped) — NOT an empty array.
    expect(store.appellationResults.map((r) => r.appellation.id)).toEqual(['barolo', 'chablis'])
    expect(store.appellationsToShow.map((r) => r.appellation.id)).toEqual(['barolo'])
    expect(store.hasSearched).toBe(true)
    expect(store.isSearching).toBe(false)
    // The prefetch and the search shared ONE fetch.
    expect(mocks.fetchWineAppellations).toHaveBeenCalledTimes(1)
  })

  it('ranks by match, lifting an appellation whose classic pairings mention the dish above an alphabetically earlier one', async () => {
    mocks.fetchWineAppellations.mockResolvedValue([
      appellation('generic', ['red'], { name: 'Aardvark' }),
      appellation('barolo', ['red'], {
        name: 'Barolo',
        food_pairings: ['grilled steak with peppers'],
      }),
    ])
    mocks.fetchUserWines.mockResolvedValue([
      wine('generic-bottle', 'red', 'generic'),
      wine('barolo-bottle', 'red', 'barolo'),
    ])
    const store = useFoodPairingsStore()
    await store.search('steak')

    expect(store.appellationsToShow.map((r) => r.appellation.id)).toEqual(['barolo', 'generic'])
    expect(store.appellationsToShow.map((r) => Math.round(r.match))).toEqual([9, 8])
    expect(store.appellationsToShow[0]!.confirmedBy).toEqual(['grilled steak with peppers'])
    // The same evidence carries to the bottles, and the cellar list is ordered by it too.
    expect(store.cellarResults.map((m) => [m.wine.id, Math.round(m.match)])).toEqual([
      ['barolo-bottle', 9],
      ['generic-bottle', 8],
    ])
  })

  it('loads the catalogue and vocabulary itself when nothing was prefetched', async () => {
    const store = useFoodPairingsStore()
    await store.search('steak')

    expect(mocks.fetchWineAppellations).toHaveBeenCalledTimes(1)
    expect(mocks.fetchFoodTags).toHaveBeenCalledTimes(1)
    expect(store.currentMatches.map((m) => m.tag.slug)).toEqual(['steak'])
    expect(store.appellationsToShow).toHaveLength(1)
  })

  it('does not refetch the vocabulary or catalogue on later searches', async () => {
    const store = useFoodPairingsStore()
    await store.search('steak')
    await store.search('steak')

    expect(mocks.fetchWineAppellations).toHaveBeenCalledTimes(1)
    expect(mocks.fetchFoodTags).toHaveBeenCalledTimes(1)
  })

  it('scores the cellar from a fresh fetchUserWines() of raw WineRecords, never a defaulted style', async () => {
    const wines: WineRecord[] = [
      wine('red-barolo', 'red', 'barolo'),
      wine('mystery', null, null), // no style, no appellation: must not be disguised as red
    ]
    mocks.fetchUserWines.mockResolvedValue(wines)
    const store = useFoodPairingsStore()
    await store.search('steak')

    expect(mocks.fetchUserWines).toHaveBeenCalledTimes(1)
    expect(store.cellarResults.map((m) => m.wine.id)).toEqual(['red-barolo'])
  })

  it('re-reads the cellar on every search so a just-added bottle shows up', async () => {
    const store = useFoodPairingsStore()
    await store.search('steak')
    expect(store.cellarResults).toEqual([])

    mocks.fetchUserWines.mockResolvedValue([wine('new-bottle', 'red', 'barolo')])
    await store.search('steak')
    expect(store.cellarResults.map((m) => m.wine.id)).toEqual(['new-bottle'])
  })

  it('waits for auth to settle before reading the cellar, and skips it when signed out', async () => {
    auth.isLoading = true
    mocks.fetchUserWines.mockResolvedValue([wine('bottle', 'red', 'barolo')])
    const store = useFoodPairingsStore()
    const searching = store.search('steak')
    await vi.waitFor(() => expect(mocks.fetchFoodTags).toHaveBeenCalled())
    await Promise.resolve()
    expect(mocks.fetchUserWines).not.toHaveBeenCalled() // still waiting on auth

    auth.isLoggedIn = false
    auth.isLoading = false
    await searching
    expect(mocks.fetchUserWines).not.toHaveBeenCalled() // signed out: no cellar to read
    expect(store.cellarResults).toEqual([])
    expect(store.appellationsToShow).toHaveLength(1) // the public part still works
  })

  it('logs free-text queries with the matched count, including zero-match queries', async () => {
    const store = useFoodPairingsStore()
    await store.search('unicorn stew')

    expect(mocks.logFoodSearchQuery).toHaveBeenCalledWith({
      raw_query: 'unicorn stew',
      matched_tag_ids: [],
      matched_count: 0,
      user_id: 'user-1',
    })
    expect(store.hasSearched).toBe(true)
    expect(store.currentMatches).toEqual([])
    expect(mocks.fetchAppellationFoodPairingsForTags).not.toHaveBeenCalled()
  })

  it('does not log direct tag selections', async () => {
    const store = useFoodPairingsStore()
    await store.loadVocabulary()
    await store.searchByTags([steak.id])

    expect(mocks.logFoodSearchQuery).not.toHaveBeenCalled()
    expect(store.currentMatches[0]).toMatchObject({ confidence: 1 })
    expect(store.appellationsToShow).toHaveLength(1)
  })

  it('only lets the latest search commit results', async () => {
    const slowOverrides = deferred<never[]>()
    mocks.fetchAppellationFoodPairingsForTags.mockReturnValueOnce(slowOverrides.promise)
    const store = useFoodPairingsStore()

    const first = store.search('steak') // its overrides fetch hangs
    await vi.waitFor(() => expect(mocks.fetchAppellationFoodPairingsForTags).toHaveBeenCalled())
    await store.search('nothing matches here') // a newer search completes first
    slowOverrides.resolve([])
    await first

    expect(store.lastQuery).toBe('nothing matches here')
    expect(store.currentMatches).toEqual([]) // the stale "steak" results never overwrote it
    expect(store.appellationResults).toEqual([])
    expect(store.isSearching).toBe(false)
  })

  it('surfaces a failed load as an error and retries the fetch on the next search', async () => {
    mocks.fetchWineAppellations.mockRejectedValueOnce(new Error('network down'))
    const store = useFoodPairingsStore()
    await store.search('steak')

    expect(store.searchError).toBe('network down')
    expect(store.hasSearched).toBe(false)
    expect(store.isSearching).toBe(false)

    await store.search('steak')
    expect(store.searchError).toBeNull()
    expect(store.appellationsToShow).toHaveLength(1)
  })

  it('treats an empty query as clearing the search', async () => {
    const store = useFoodPairingsStore()
    await store.search('steak')
    await store.search('   ')

    expect(store.hasSearched).toBe(false)
    expect(store.appellationResults).toEqual([])
  })
})

describe('useFoodPairingsStore admin actions', () => {
  const salmon = tag('salmon', ['salmon'], { sort_order: 20 })
  const lemon = tag('lemon', ['lemon'], { sort_order: 10 })

  async function loaded() {
    mocks.fetchFoodTags.mockResolvedValue([lemon, salmon])
    mocks.fetchWineStyleFoodPairings.mockResolvedValue([
      baseline('white', 'salmon', 1),
      baseline('white', 'lemon', 2),
    ])
    mocks.fetchDishPresets.mockResolvedValue([
      {
        id: 'p1',
        label: 'Grilled salmon',
        sort_order: 10,
        created_at: '',
        foodTagIds: [salmon.id, lemon.id],
      },
    ])
    const store = useFoodPairingsStore()
    await store.loadVocabulary()
    return store
  }

  it('keeps the vocabulary in the pinned (sort_order, id) order when a tag is added or edited', async () => {
    const store = await loaded()
    mocks.createFoodTag.mockResolvedValue(tag('early', ['early'], { sort_order: 1 }))
    await store.addTag({
      category: 'protein',
      name: 'early',
      slug: 'early',
      synonyms: ['early'],
      sort_order: 1,
    })
    expect(store.tags.map((t) => t.slug)).toEqual(['early', 'lemon', 'salmon'])

    mocks.updateFoodTag.mockResolvedValue({ ...salmon, sort_order: 0 })
    await store.saveTag(salmon.id, { sort_order: 0 })
    expect(store.tags.map((t) => t.slug)).toEqual(['salmon', 'early', 'lemon'])
  })

  it('a renamed synonym takes effect in matching straight away', async () => {
    const store = await loaded()
    await store.search('ocean trout')
    expect(store.currentMatches).toEqual([])

    mocks.updateFoodTag.mockResolvedValue({ ...salmon, synonyms: ['salmon', 'ocean trout'] })
    await store.saveTag(salmon.id, { synonyms: ['salmon', 'ocean trout'] })
    await store.search('ocean trout')
    expect(store.currentMatches.map((m) => m.tag.slug)).toEqual(['salmon'])
  })

  it('mirrors the DB cascade locally when a tag is deleted', async () => {
    const store = await loaded()
    store.byAppellation['a'] = [
      {
        id: 'o1',
        appellation_id: 'a',
        wine_style: 'white',
        food_tag_id: salmon.id,
        affinity: 2,
        note: null,
        created_at: '',
      },
      {
        id: 'o2',
        appellation_id: 'a',
        wine_style: 'white',
        food_tag_id: lemon.id,
        affinity: 1,
        note: null,
        created_at: '',
      },
    ]
    await store.removeTag(salmon.id)

    expect(mocks.deleteFoodTag).toHaveBeenCalledWith(salmon.id)
    expect(store.tags.map((t) => t.slug)).toEqual(['lemon'])
    expect(store.wineStyleFoodPairings.map((r) => r.food_tag_id)).toEqual([lemon.id])
    expect(store.dishPresets[0]!.foodTagIds).toEqual([lemon.id])
    expect(store.forAppellation('a').map((r) => r.id)).toEqual(['o2'])
  })

  it('replaces the baseline row for the same (style, tag) instead of duplicating it', async () => {
    const store = await loaded()
    mocks.upsertWineStyleFoodPairing.mockResolvedValue({
      ...baseline('white', 'salmon', 2),
      note: 'classic',
    })
    await store.saveBaseline({
      wine_style: 'white',
      food_tag_id: salmon.id,
      affinity: 2,
      note: 'classic',
    })

    const rows = store.wineStyleFoodPairings.filter((r) => r.food_tag_id === salmon.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ affinity: 2, note: 'classic' })
    expect(store.wineStyleFoodPairings).toHaveLength(2)
  })

  it('removes a baseline row', async () => {
    const store = await loaded()
    const row = store.wineStyleFoodPairings.find((r) => r.food_tag_id === lemon.id)!
    await store.removeBaseline(row)
    expect(mocks.deleteWineStyleFoodPairing).toHaveBeenCalledWith(row.id)
    expect(store.wineStyleFoodPairings.map((r) => r.food_tag_id)).toEqual([salmon.id])
  })

  it('creates, retags, renames and deletes a dish preset', async () => {
    const store = await loaded()
    mocks.createDishPreset.mockResolvedValue({
      id: 'p2',
      label: 'Aardvark',
      sort_order: 5,
      created_at: '',
    })
    const created = await store.addPreset({ label: 'Aardvark', sort_order: 5 })
    expect(created.foodTagIds).toEqual([])
    expect(store.dishPresets.map((p) => p.label)).toEqual(['Aardvark', 'Grilled salmon'])

    await store.setPresetTags('p2', [lemon.id, lemon.id])
    expect(mocks.replaceDishPresetTags).toHaveBeenCalledWith('p2', [lemon.id, lemon.id])
    expect(store.dishPresets.find((p) => p.id === 'p2')!.foodTagIds).toEqual([lemon.id])

    mocks.updateDishPreset.mockResolvedValue({
      id: 'p2',
      label: 'Zebra',
      sort_order: 50,
      created_at: '',
    })
    await store.savePreset('p2', { label: 'Zebra', sort_order: 50 })
    const zebra = store.dishPresets.find((p) => p.id === 'p2')!
    expect(zebra).toMatchObject({ label: 'Zebra', foodTagIds: [lemon.id] }) // tags survive a rename
    expect(store.dishPresets.map((p) => p.label)).toEqual(['Grilled salmon', 'Zebra'])

    await store.removePreset('p2')
    expect(store.dishPresets.map((p) => p.id)).toEqual(['p1'])
  })

  it('shows only still-unmatched queries in the backlog and clears dismissed ones', async () => {
    const store = await loaded()
    const row = (id: string, raw: string) => ({
      id,
      raw_query: raw,
      matched_tag_ids: [],
      matched_count: 0,
      user_id: null,
      created_at: '2026-09-30',
    })
    mocks.fetchFoodSearchQueries.mockResolvedValue([
      row('1', 'salmon'), // the vocabulary matches this now
      row('2', 'tofu scramble'),
      row('3', 'Tofu  Scramble'),
    ])
    await store.loadSearchQueries()
    expect(store.unmatchedQueries.map((q) => [q.query, q.count])).toEqual([['tofu scramble', 2]])

    await store.dismissSearchQueries(store.unmatchedQueries[0]!.ids)
    expect(mocks.deleteFoodSearchQueries).toHaveBeenCalledWith(['2', '3'])
    expect(store.unmatchedQueries).toEqual([])
  })
})
