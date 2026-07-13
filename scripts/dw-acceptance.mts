/* Ad-hoc acceptance checks for the drinking-window engine (spec §9). Run with tsx. */
import {
  estimateDrinkingWindow,
  resolveArchetypeByKeyword,
  parseVintageScore,
} from '../src/lib/drinkingWindow.ts'
import type { EngineConfig, ArchetypeRecord } from '../src/types/drinkingWindow.ts'

const A = (key: string, t_start: number, t_peak: number, t_end: number, curve: any): ArchetypeRecord =>
  ({ id: key, key, name: key, t_start, t_peak, t_end, curve, created_at: '', updated_at: '' })

const archetypes: Record<string, ArchetypeRecord> = {
  leftBankBordeaux: A('leftBankBordeaux', 6, 14, 28, 'lateBell'),
  rightBankBordeaux: A('rightBankBordeaux', 4, 10, 22, 'lateBell'),
  whiteBurgundy: A('whiteBurgundy', 2, 6, 12, 'earlyBell'),
  redBurgundyGC: A('redBurgundyGC', 6, 13, 26, 'standardBell'),
  chiantiClassico: A('chiantiClassico', 3, 7, 15, 'standardBell'),
}

const config: EngineConfig = {
  archetypes,
  settings: {
    id: 'default', k_start: 0.08, k_peak: 0.15, k_end: 0.22, risk_default: 'balanced',
    score_midpoint: 90, score_divisor: 3, premox_cap_years: 12, premox_vintage_cutoff: 2018,
    premox_age_years: 7, hot_drinkby_factor: 0.85, hot_peak_factor: 0.9,
    producer_ext_t5: 0.12, producer_ext_t45: 0.08, producer_ext_t4: 0.05, updated_at: '',
  },
  hotVintages: new Map<number, 'all' | Set<string>>([
    [2003, 'all'],
    [2009, new Set(['chiantiClassico', 'brunello', 'superTuscan'])],
  ]),
  producerTier: (p?: string) => (/pichon ?baron/i.test(p ?? '') ? 4.5 : null),
}

let pass = 0
let fail = 0
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${name}`) }
  else { fail++; console.log(`✗ ${name}  ${detail}`) }
}

const CY = 2026

// 1: docWindow anchored
const w1 = estimateDrinkingWindow(
  { vintage: 2016, producer: 'Pichon Baron', vintageScore: 95, archetypeKey: 'leftBankBordeaux',
    docWindow: { start: 2030, end: 2065 }, currentYear: CY }, config)
check('1 docWindow enter=2030', w1.enter === 2030, `got ${w1.enter}`)
check('1 docWindow drinkBy=2065', w1.drinkBy === 2065, `got ${w1.drinkBy}`)
check('1 confidence Medium', w1.confidence === 'Medium', w1.confidence)
check('1 archetype leftBankBordeaux', w1.archetype === 'leftBankBordeaux', w1.archetype)

// 2: Pomerol -> rightBankBordeaux (keyword seeder)
check('2 Pomerol->rightBank', resolveArchetypeByKeyword({ region: 'Pomerol' }) === 'rightBankBordeaux')
check('2 St-Émilion->rightBank', resolveArchetypeByKeyword({ region: 'Saint-Émilion' }) === 'rightBankBordeaux')

// 3: Meursault 2017 -> whiteBurgundy premox cap + note
const w3 = estimateDrinkingWindow(
  { vintage: 2017, vintageScore: 92, archetypeKey: 'whiteBurgundy', currentYear: CY }, config)
check('3 premox cap drinkBy<=2029', w3.drinkBy <= 2029, `got ${w3.drinkBy}`)
check('3 premox note', w3.notes.some((n) => /premox/i.test(n)))

// 4: Gevrey GC -> redBurgundyGC, Low, wide uncertainty
check('4 GC keyword', resolveArchetypeByKeyword({ region: 'Gevrey-Chambertin Grand Cru' }) === 'redBurgundyGC')
const w4 = estimateDrinkingWindow(
  { vintage: 2020, vintageScore: 95, archetypeKey: 'redBurgundyGC', style: 'Grand Cru', currentYear: CY }, config)
check('4 confidence Low', w4.confidence === 'Low', w4.confidence)
check('4 wide uncertainty (>=6)', w4.uncertaintyYears >= 6, `got ${w4.uncertaintyYears}`)

// 5: Chianti 2009 hot vintage pulled in
const w5cold = estimateDrinkingWindow(
  { vintage: 2010, vintageScore: 90, archetypeKey: 'chiantiClassico', currentYear: CY }, config)
const w5hot = estimateDrinkingWindow(
  { vintage: 2009, vintageScore: 90, archetypeKey: 'chiantiClassico', currentYear: CY }, config)
check('5 hot vintage note', w5hot.notes.some((n) => /hot vintage/i.test(n)))
check('5 hot drinkBy span < normal span',
  (w5hot.drinkBy - 2009) < (w5cold.drinkBy - 2010), `${w5hot.drinkBy - 2009} vs ${w5cold.drinkBy - 2010}`)

// 6: NV
const w6 = estimateDrinkingWindow({ nonVintage: true, currentYear: CY, archetypeKey: null }, config)
check('6 NV enter≈now', w6.enter === CY, `got ${w6.enter}`)
check('6 NV drinkBy now+4', w6.drinkBy === CY + 4, `got ${w6.drinkBy}`)
check('6 NV note', w6.notes.some((n) => /non-vintage/i.test(n)))

// 7: criticWindow verbatim High
const w7 = estimateDrinkingWindow(
  { vintage: 2015, archetypeKey: 'leftBankBordeaux', criticWindow: { start: 2025, end: 2050 }, currentYear: CY }, config)
check('7 critic enter=2025', w7.enter === 2025, `got ${w7.enter}`)
check('7 critic drinkBy=2050', w7.drinkBy === 2050, `got ${w7.drinkBy}`)
check('7 critic High', w7.confidence === 'High', w7.confidence)

// 8: risk stance conservative vs push
const base = { vintage: 2016, vintageScore: 95, archetypeKey: 'leftBankBordeaux', currentYear: CY } as const
const wc = estimateDrinkingWindow({ ...base, riskStance: 'conservative' }, config)
const wp = estimateDrinkingWindow({ ...base, riskStance: 'push' }, config)
check('8 enter unchanged', wc.enter === wp.enter, `${wc.enter} vs ${wp.enter}`)
check('8 push drinkBy later', wp.drinkBy > wc.drinkBy, `${wc.drinkBy} vs ${wp.drinkBy}`)

// parse helper
check('parse range midpoint', parseVintageScore('89-91').score === 90)
check('parse NV', parseVintageScore('NV').nonVintage === true)
check('parse NT unknown', parseVintageScore('NT').score === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
