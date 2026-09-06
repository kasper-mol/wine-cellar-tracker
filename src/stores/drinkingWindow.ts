import { defineStore } from 'pinia'
import { ref } from 'vue'
import { grapeLabel } from '@/types/wines'
import type { UserWine } from '@/types/wines'
import type {
  ArchetypeRecord,
  ArchetypeMappingRecord,
  ProducerTierRecord,
  HotVintageRecord,
  SettingsRecord,
  DrinkingWindow,
  EngineConfig,
  WineInput,
  CuveeRecord,
  AbsoluteOverrideRecord,
  ConditionFlagRecord,
} from '@/types/drinkingWindow'
import type { VintageRatingRecord } from '@/types/vintageRatings'
import { estimateDrinkingWindow, parseVintageScore } from '@/lib/drinkingWindow'
import { buildEngineConfig as buildEngineConfigPure } from '@/lib/engineConfig'
import {
  fetchArchetypes,
  createArchetype,
  updateArchetype,
  deleteArchetype,
  fetchArchetypeMappings,
  setAppellationMapping,
  setRegionMapping,
  fetchProducerTiers,
  createProducerTier,
  updateProducerTier,
  deleteProducerTier,
  fetchHotVintages,
  createHotVintage,
  deleteHotVintage,
  fetchSettings,
  updateSettings,
  fetchCuvees,
  fetchAbsoluteOverrides,
  fetchConditionFlags,
} from '@/services/drinkingWindow'
import { listVintageRatings } from '@/services/vintageRatings'
import type {
  ArchetypeCreatePayload,
  ArchetypeUpdatePayload,
  ProducerTierCreatePayload,
  ProducerTierUpdatePayload,
  HotVintageCreatePayload,
  SettingsUpdatePayload,
} from '@/types/drinkingWindow'

export const useDrinkingWindowStore = defineStore('drinkingWindowStore', () => {
  const archetypes = ref<ArchetypeRecord[]>([])
  const mappings = ref<ArchetypeMappingRecord[]>([])
  const producerTiers = ref<ProducerTierRecord[]>([])
  const hotVintages = ref<HotVintageRecord[]>([])
  const cuvees = ref<CuveeRecord[]>([])
  const absoluteOverrides = ref<AbsoluteOverrideRecord[]>([])
  const conditionFlags = ref<ConditionFlagRecord[]>([])
  const settings = ref<SettingsRecord | null>(null)
  const vintageRatings = ref<VintageRatingRecord[]>([])

  const loading = ref(false)
  const loaded = ref(false)

  // --- derived lookup indexes (rebuilt lazily inside computeWindow) ---
  function archetypeKeyById(id: string): string | undefined {
    return archetypes.value.find((a) => a.id === id)?.key
  }

  function buildEngineConfig(): EngineConfig | null {
    if (!settings.value) return null
    return buildEngineConfigPure({
      archetypes: archetypes.value,
      settings: settings.value,
      hotVintages: hotVintages.value,
      producerTiers: producerTiers.value,
      cuvees: cuvees.value,
      absoluteOverrides: absoluteOverrides.value,
      conditionFlags: conditionFlags.value,
    })
  }

  /** Archetype resolution order: the user's own pick wins, then the appellation
   *  mapping, then the region mapping. */
  function mappedArchetypeKey(wine: UserWine): string | null {
    if (wine.archetypeId) {
      const byUser = archetypeKeyById(wine.archetypeId)
      if (byUser) return byUser
    }
    const byApp = wine.appellationId
      ? mappings.value.find((m) => m.appellation_id === wine.appellationId)
      : undefined
    if (byApp) return archetypeKeyById(byApp.archetype_id) ?? null
    const byRegion = wine.regionId
      ? mappings.value.find((m) => m.region_id === wine.regionId)
      : undefined
    if (byRegion) return archetypeKeyById(byRegion.archetype_id) ?? null
    return null
  }

  /** The archetype key a wine would get from its appellation/region alone —
   *  i.e. ignoring any user pick. Used by the intake form to label the
   *  "auto" option. */
  function inheritedArchetypeKey(wine: UserWine): string | null {
    return mappedArchetypeKey({ ...wine, archetypeId: null })
  }

  /** Vintage rating for a wine's year — appellation match preferred over region. */
  function vintageRatingFor(wine: UserWine) {
    if (!wine.vintage) return null
    const byApp = wine.appellationId
      ? vintageRatings.value.find(
          (r) => r.appellation_id === wine.appellationId && r.year === wine.vintage,
        )
      : undefined
    const byRegion = wine.regionId
      ? vintageRatings.value.find((r) => r.region_id === wine.regionId && r.year === wine.vintage)
      : undefined
    return byApp ?? byRegion ?? null
  }

  /** Compute the drinking window for a cellar wine. Returns null when no archetype is mapped. */
  function computeWindow(wine: UserWine): DrinkingWindow | null {
    const config = buildEngineConfig()
    if (!config) return null

    const archetypeKey = mappedArchetypeKey(wine)
    const critic =
      wine.criticWindowStart && wine.criticWindowEnd
        ? { start: wine.criticWindowStart, end: wine.criticWindowEnd }
        : null

    // A cuvée archetype hint or an absolute override can produce a window even
    // when the appellation/region isn't mapped.
    const cuveeArchetype = config.cuvee(wine.producer, wine.cuvee)?.archetype_key ?? null
    const hasOverride = !!config.absoluteOverride(wine.producer, wine.cuvee)

    // Decision: unmapped wines get no window (UI prompts to map) — unless a
    // critic window, cuvée hint, or override gives us something to anchor to.
    if (!archetypeKey && !critic && !cuveeArchetype && !hasOverride) return null

    const rating = vintageRatingFor(wine)
    const parsed = rating ? parseVintageScore(rating.rating) : { score: null, nonVintage: false }
    const docWindow =
      rating && rating.drink_from != null && rating.drink_until != null
        ? { start: rating.drink_from, end: rating.drink_until }
        : null

    const input: WineInput = {
      vintage: wine.vintage || null,
      region: wine.appellationName || wine.regionName,
      grape: grapeLabel(wine),
      producer: wine.producer,
      // include the label so GC / predikat style hints can refine the archetype
      style: wine.name,
      wineType: wine.style ?? null,
      vintageScore: parsed.score,
      docWindow,
      criticWindow: critic,
      nonVintage: parsed.nonVintage,
      archetypeKey,
      cuvee: wine.cuvee,
      predikatLevel: wine.predikatLevel,
      sweetness: wine.sweetness,
      juraStyle: wine.juraStyle,
      friuliStyle: wine.friuliStyle,
      champagneType: wine.champagneType,
      disgorgementDate: wine.disgorgementDate,
    }
    return estimateDrinkingWindow(input, config)
  }

  /* ----------------------------- loading ----------------------------- */

  async function loadConfig(force = false) {
    if (loaded.value && !force) return
    loading.value = true
    try {
      const [a, m, p, h, s, vr, cu, ov, cf] = await Promise.all([
        fetchArchetypes(),
        fetchArchetypeMappings(),
        fetchProducerTiers(),
        fetchHotVintages(),
        fetchSettings(),
        listVintageRatings(),
        fetchCuvees(),
        fetchAbsoluteOverrides(),
        fetchConditionFlags(),
      ])
      archetypes.value = a
      mappings.value = m
      producerTiers.value = p
      hotVintages.value = h
      settings.value = s
      vintageRatings.value = vr
      cuvees.value = cu
      absoluteOverrides.value = ov
      conditionFlags.value = cf
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /* ----------------------------- mutations ----------------------------- */

  async function addArchetype(payload: ArchetypeCreatePayload) {
    const created = await createArchetype(payload)
    archetypes.value = [...archetypes.value, created].sort((a, b) => a.name.localeCompare(b.name))
    return created
  }

  async function removeArchetype(id: string) {
    await deleteArchetype(id)
    archetypes.value = archetypes.value.filter((a) => a.id !== id)
    mappings.value = mappings.value.filter((m) => m.archetype_id !== id)
  }

  async function saveArchetype(id: string, payload: ArchetypeUpdatePayload) {
    const updated = await updateArchetype(id, payload)
    archetypes.value = archetypes.value.map((a) => (a.id === id ? updated : a))
    return updated
  }

  async function assignAppellation(appellationId: string, archetypeId: string | null) {
    await setAppellationMapping(appellationId, archetypeId)
    mappings.value = mappings.value.filter((m) => m.appellation_id !== appellationId)
    if (archetypeId) {
      const refreshed = await fetchArchetypeMappings()
      mappings.value = refreshed
    }
  }

  async function assignRegion(regionId: string, archetypeId: string | null) {
    await setRegionMapping(regionId, archetypeId)
    mappings.value = mappings.value.filter((m) => m.region_id !== regionId)
    if (archetypeId) {
      const refreshed = await fetchArchetypeMappings()
      mappings.value = refreshed
    }
  }

  async function addProducerTier(payload: ProducerTierCreatePayload) {
    const created = await createProducerTier(payload)
    producerTiers.value = [...producerTiers.value, created].sort((a, b) =>
      a.name.localeCompare(b.name),
    )
    return created
  }

  async function saveProducerTier(id: string, payload: ProducerTierUpdatePayload) {
    const updated = await updateProducerTier(id, payload)
    producerTiers.value = producerTiers.value.map((p) => (p.id === id ? updated : p))
    return updated
  }

  async function removeProducerTier(id: string) {
    await deleteProducerTier(id)
    producerTiers.value = producerTiers.value.filter((p) => p.id !== id)
  }

  async function addHotVintage(payload: HotVintageCreatePayload) {
    const created = await createHotVintage(payload)
    hotVintages.value = [...hotVintages.value, created].sort((a, b) => b.year - a.year)
    return created
  }

  async function removeHotVintage(id: string) {
    await deleteHotVintage(id)
    hotVintages.value = hotVintages.value.filter((h) => h.id !== id)
  }

  async function saveSettings(payload: SettingsUpdatePayload) {
    const updated = await updateSettings(payload)
    settings.value = updated
    return updated
  }

  return {
    archetypes,
    mappings,
    producerTiers,
    hotVintages,
    settings,
    loading,
    loaded,
    loadConfig,
    computeWindow,
    inheritedArchetypeKey,
    addArchetype,
    removeArchetype,
    saveArchetype,
    assignAppellation,
    assignRegion,
    addProducerTier,
    saveProducerTier,
    removeProducerTier,
    addHotVintage,
    removeHotVintage,
    saveSettings,
  }
})
