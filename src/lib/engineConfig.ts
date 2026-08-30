/* engineConfig.ts — pure assembly of the injected EngineConfig from raw DB rows.
 * Shared by the Pinia store (runtime) and the acceptance script (live-config test),
 * so both build the engine's lookups identically. */
import { norm } from '@/lib/drinkingWindow'
import type {
  ArchetypeRecord,
  SettingsRecord,
  HotVintageRecord,
  ProducerTierRecord,
  CuveeRecord,
  AbsoluteOverrideRecord,
  ConditionFlagRecord,
  EngineConfig,
  HotVintageDetail,
} from '@/types/drinkingWindow'

export interface EngineConfigInput {
  archetypes: ArchetypeRecord[]
  settings: SettingsRecord
  hotVintages: HotVintageRecord[]
  producerTiers: ProducerTierRecord[]
  cuvees: CuveeRecord[]
  absoluteOverrides: AbsoluteOverrideRecord[]
  conditionFlags: ConditionFlagRecord[]
}

export function buildEngineConfig(input: EngineConfigInput): EngineConfig {
  const archetypesByKey: Record<string, ArchetypeRecord> = {}
  for (const a of input.archetypes) archetypesByKey[a.key] = a

  // Hot vintages: year -> { scope -> detail }, with 'all' as a wildcard scope.
  const hot = new Map<number, Map<string, HotVintageDetail>>()
  for (const h of input.hotVintages) {
    const byScope = hot.get(h.year) ?? new Map<string, HotVintageDetail>()
    byScope.set(h.scope, {
      compression: h.compression != null ? Number(h.compression) : null,
      hardCapYears: h.hard_cap_years != null ? Number(h.hard_cap_years) : null,
      blockTierOverride: !!h.block_tier_override,
    })
    hot.set(h.year, byScope)
  }

  // Producer tier by normalized name.
  const tierMap = new Map<string, number>()
  for (const p of input.producerTiers) tierMap.set(norm(p.name), Number(p.tier))

  // Producer id -> normalized name (to key cuvées by producer name).
  const producerNormById = new Map<string, string>()
  for (const p of input.producerTiers) producerNormById.set(p.id, norm(p.name))

  // Cuvées keyed by "normProducer|lowerCuvee".
  const cuveeMap = new Map<string, CuveeRecord>()
  for (const c of input.cuvees) {
    const pn = producerNormById.get(c.producer_id)
    if (pn) cuveeMap.set(`${pn}|${c.cuvee.toLowerCase()}`, c)
  }

  // Absolute overrides keyed by "normProducer|lowerCuvee" (cuvée required).
  const overrideMap = new Map<string, AbsoluteOverrideRecord>()
  for (const o of input.absoluteOverrides) {
    if (o.cuvee) overrideMap.set(`${norm(o.producer)}|${o.cuvee.toLowerCase()}`, o)
  }

  // Condition flags split into exact-producer and wildcard ('*...') buckets.
  const flagsByProducer = new Map<string, ConditionFlagRecord[]>()
  const wildcardFlags: ConditionFlagRecord[] = []
  for (const f of input.conditionFlags) {
    if (f.producer.trim().startsWith('*')) {
      wildcardFlags.push(f)
    } else {
      const key = norm(f.producer)
      const list = flagsByProducer.get(key) ?? []
      list.push(f)
      flagsByProducer.set(key, list)
    }
  }
  const inVintageRange = (f: ConditionFlagRecord, vintage?: number | null) => {
    if (f.vintage_from == null && f.vintage_to == null) return true
    if (vintage == null) return false
    if (f.vintage_from != null && vintage < f.vintage_from) return false
    if (f.vintage_to != null && vintage > f.vintage_to) return false
    return true
  }
  // Alphabetic keywords from a wildcard producer string, e.g. '*ANY Ahr producer' -> ['ahr'].
  const STOP = new Set(['any', 'all', 'producer', 'producers', 'the', 'and'])
  const wildcardKeywords = (producer: string) =>
    producer
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))

  return {
    archetypes: archetypesByKey,
    settings: input.settings,
    hotVintage: (year: number, archetypeKey: string): HotVintageDetail | null => {
      const byScope = hot.get(year)
      if (!byScope) return null
      return byScope.get(archetypeKey) ?? byScope.get('all') ?? null
    },
    producerTier: (producer?: string) => tierMap.get(norm(producer)) ?? null,
    cuvee: (producer?: string, cuvee?: string | null) => {
      if (!cuvee) return null
      return cuveeMap.get(`${norm(producer)}|${cuvee.toLowerCase()}`) ?? null
    },
    absoluteOverride: (producer?: string, cuvee?: string | null) => {
      if (!cuvee) return null
      return overrideMap.get(`${norm(producer)}|${cuvee.toLowerCase()}`) ?? null
    },
    conditionFlags: (producer?: string, vintage?: number | null, region?: string) => {
      const out = (flagsByProducer.get(norm(producer)) ?? []).filter((f) =>
        inVintageRange(f, vintage),
      )
      if (region) {
        const hay = region.toLowerCase()
        for (const f of wildcardFlags) {
          if (
            inVintageRange(f, vintage) &&
            wildcardKeywords(f.producer).some((kw) => hay.includes(kw))
          ) {
            out.push(f)
          }
        }
      }
      return out
    },
  }
}
