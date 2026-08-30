/* Acceptance checks for the drinking-window engine (spec §9).
 * Builds the EngineConfig from the LIVE Supabase project (dw_* tables are
 * public-read) so these checks validate the engine AND the seed import together.
 * Run with: tsx scripts/dw-acceptance.mts
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { estimateDrinkingWindow, parseVintageScore } from '../src/lib/drinkingWindow/index.ts'
import { buildEngineConfig } from '../src/lib/engineConfig.ts'
import type { DrinkingWindow } from '../src/types/drinkingWindow.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* --- load .env (VITE_SUPABASE_URL / VITE_SUPABASE_KEY) --- */
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {
    /* ignore */
  }
  return env
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_KEY ?? process.env.VITE_SUPABASE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_KEY (.env).')
  process.exit(2)
}
const db = createClient(url, key)

async function fetchAll<T>(table: string): Promise<T[]> {
  const { data, error } = await db.from(table).select('*')
  if (error) throw new Error(`${table}: ${error.message}`)
  return (data ?? []) as T[]
}

const [archetypes, hotVintages, producerTiers, cuvees, absoluteOverrides, conditionFlags] =
  await Promise.all([
    fetchAll<any>('dw_archetypes'),
    fetchAll<any>('dw_hot_vintages'),
    fetchAll<any>('dw_producer_tiers'),
    fetchAll<any>('dw_cuvees'),
    fetchAll<any>('dw_absolute_overrides'),
    fetchAll<any>('dw_condition_flags'),
  ])
const { data: settingsRow, error: sErr } = await db
  .from('dw_settings')
  .select('*')
  .eq('id', 'default')
  .single()
if (sErr) throw new Error(`dw_settings: ${sErr.message}`)

const config = buildEngineConfig({
  archetypes,
  settings: settingsRow as any,
  hotVintages,
  producerTiers,
  cuvees,
  absoluteOverrides,
  conditionFlags,
})

/* --- tiny assert harness --- */
let pass = 0
let fail = 0
const check = (name: string, cond: boolean, detail = '') => {
  if (cond) {
    pass++
    console.log(`✓ ${name}`)
  } else {
    fail++
    console.log(`✗ ${name}  ${detail}`)
  }
}
const CY = 2026
const est = (i: Parameters<typeof estimateDrinkingWindow>[0]) =>
  estimateDrinkingWindow({ currentYear: CY, ...i }, config)
const flags = (w: DrinkingWindow | null) => (w ? w.conditionFlags.map((f) => f.flag) : [])

/* ============================ Phase-4 cases ============================ */

// 1. Vin Jaune 2015 — release offset suppresses "drink now" before 2022.
const vj = est({ vintage: 2015, archetypeKey: 'vinJaune', producer: 'Jean Macle' })!
check('1 VinJaune 2015 enter >= 2022', vj.enter >= 2022, `enter=${vj.enter}`)
check('1 VinJaune releaseOffset=7', vj.releaseOffsetYears === 7, `ro=${vj.releaseOffsetYears}`)
const vj2021 = est({
  vintage: 2015,
  archetypeKey: 'vinJaune',
  producer: 'Jean Macle',
  currentYear: 2021,
})!
check('1 VinJaune Hold in 2021 (not drinkable)', vj2021.phaseNow === 'Hold', vj2021.phaseNow)

// 2. Gravner Ribolla 2011 — override friuliOrange 7/15/35; peak lands ~2023–2035.
const gr = est({
  vintage: 2011,
  archetypeKey: 'friuliOrange',
  producer: 'Josko Gravner',
  cuvee: 'Ribolla Gialla',
})!
check(
  '2 Gravner override applied',
  gr.notes.some((n) => /override/i.test(n)),
  gr.notes.join('|'),
)
check(
  '2 Gravner peakStart ~2020-2025',
  gr.peakStart >= 2019 && gr.peakStart <= 2026,
  `peakStart=${gr.peakStart}`,
)
check(
  '2 Gravner peakEnd ~2032-2038',
  gr.peakEnd >= 2031 && gr.peakEnd <= 2039,
  `peakEnd=${gr.peakEnd}`,
)
check('2 Gravner not 2013-start naive', gr.enter >= 2018, `enter=${gr.enter}`)

// 3. Coche-Dury 2018 white Burgundy — hard cap; tier cannot push past ~2028.
const coche = est({ vintage: 2018, archetypeKey: 'whiteBurgundy', producer: 'Coche-Dury' })!
check('3 Coche 2018 drinkBy <= 2028', coche.drinkBy <= 2028, `drinkBy=${coche.drinkBy}`)
check(
  '3 Coche hard-cap note',
  coche.notes.some((n) => /cap/i.test(n)),
  coche.notes.join('|'),
)

// 4. Flag propagation: 2017 whiteBurgundy NOT compressed, 2017 Barolo IS.
const wb17 = est({ vintage: 2017, archetypeKey: 'whiteBurgundy', producer: 'Coche-Dury' })!
const bar17 = est({ vintage: 2017, archetypeKey: 'barolo', producer: 'x' })!
check('4 2017 whiteBurgundy NOT compressed', !wb17.notes.some((n) => /hot vintage/i.test(n)))
check(
  '4 2017 Barolo IS compressed',
  bar17.notes.some((n) => /hot vintage/i.test(n)),
)

// 5. 2009 Right-Bank NOT compressed, 2009 Brunello IS.
const rb09 = est({ vintage: 2009, archetypeKey: 'rightBankBordeaux', producer: 'x' })!
const br09 = est({ vintage: 2009, archetypeKey: 'brunello', producer: 'x' })!
check('5 2009 Right-Bank NOT compressed', !rb09.notes.some((n) => /hot vintage/i.test(n)))
check(
  '5 2009 Brunello IS compressed',
  br09.notes.some((n) => /hot vintage/i.test(n)),
)

// 6. Terlano Rarity — override applies (altoAdigeWhite 8/25/50), tier NOT stacked.
const rarity = est({
  vintage: 2015,
  archetypeKey: 'altoAdigeWhite',
  producer: 'Cantina Terlano',
  cuvee: 'Rarity',
})!
check(
  '6 Rarity override note',
  rarity.notes.some((n) => /override/i.test(n)),
)
check('6 Rarity enter=2023 (2015+8)', rarity.enter === 2023, `enter=${rarity.enter}`)
check('6 Rarity long window (drinkBy>=2060)', rarity.drinkBy >= 2060, `drinkBy=${rarity.drinkBy}`)

// 7. Terlano entry Pinot Bianco — altoAdigeWhite baseline, NOT the Rarity override.
const entry = est({
  vintage: 2015,
  archetypeKey: 'altoAdigeWhite',
  producer: 'Cantina Terlano',
  cuvee: 'Pinot Bianco',
})!
check('7 entry uses altoAdigeWhite', entry.archetype === 'altoAdigeWhite', entry.archetype)
check('7 entry NOT the override (no override note)', !entry.notes.some((n) => /override/i.test(n)))
check(
  '7 entry window far below Rarity',
  entry.drinkBy < rarity.drinkBy - 15,
  `entry=${entry.drinkBy} rarity=${rarity.drinkBy}`,
)

// 8. Meyer-Näkel 2019 — condition flag alongside the window.
const mn = est({
  vintage: 2019,
  archetypeKey: 'spatburgunderGG',
  producer: 'Meyer-Näkel',
  region: 'Ahr',
})!
check('8 Meyer-Näkel returns a window', mn != null)
check(
  '8 Meyer-Näkel AHR_FLOOD_2021 flag',
  flags(mn).includes('AHR_FLOOD_2021'),
  flags(mn).join(','),
)

// 9. Puffeney 2016 — does not resolve (NO_VINTAGES_EXIST).
const puff = est({
  vintage: 2016,
  archetypeKey: 'juraSavagninOxidative',
  producer: 'Jacques Puffeney',
})
check('9 Puffeney 2016 does not resolve', puff === null, `got ${puff ? 'a window' : 'null'}`)

/* ---------------------- parse-helper unit checks ---------------------- */
check('parse range midpoint', parseVintageScore('89-91').score === 90)
check('parse NV', parseVintageScore('NV').nonVintage === true)
check('parse NT unknown', parseVintageScore('NT').score === null)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
