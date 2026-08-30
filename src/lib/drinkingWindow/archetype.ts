/* archetype.ts — archetype key refinement.
 *
 * refineArchetype(): given an already-resolved base key (from the explicit DB
 * mapping), upgrade it based on Grand Cru / prädikat / sweetness / oxidative-style
 * hints. Runs at scoring time. Structured intake fields (input.*) beat label
 * sniffing.
 *
 * (The old resolveArchetypeByKeyword() coarse seeder was removed once every
 * appellation was mapped explicitly in the DB — mappings are DB-driven now.)
 */
import type { WineInput } from '@/types/drinkingWindow'

/** Upgrade a base archetype key using style hints. Each block is one wine
 *  family whose sub-styles age very differently (a Sec Vouvray vs a Moelleux,
 *  an ouillé Jura white vs a sous-voile one). Structured fields win over the
 *  label text `hay`. Returns the (possibly unchanged) key. */
export function refineArchetype(baseKey: string, hay: string, input?: WineInput): string {
  // Red Burgundy Grand Cru (label only — no structured GC field).
  if (
    baseKey === 'redBurgundy' &&
    /grand ?cru|romanée|romanee|chambertin|musigny|richebourg|bonnes-?mares|échézeaux|echezeaux|tâche|tache/i.test(
      hay,
    )
  ) {
    return 'redBurgundyGC'
  }

  // German Riesling prädikat: structured field wins, else label sniff.
  if (baseKey === 'germanRiesling') {
    const p = (input?.predikatLevel ?? '').toLowerCase()
    if (/tba|ba|eiswein/.test(p) || /tba|trockenbeeren|beerenauslese|eiswein/i.test(hay))
      return 'sweetGerman'
    if (/auslese/.test(p) || /auslese/i.test(hay)) return 'germanAuslese'
    if (
      /gg|trocken/.test(p) ||
      /\bgg\b|grosses gewächs|grosses gewachs|trocken|großes|grosses lage/i.test(hay)
    )
      return 'germanGG'
  }

  // Loire Chenin sweetness: Sec baseline -> Demi-Sec/Moelleux extends the window.
  if (baseKey === 'loireCheninSec') {
    const s = (input?.sweetness ?? '').toLowerCase()
    if (/demi|moelleux|doux/.test(s) || /demi-?sec|moelleux|doux/i.test(hay))
      return 'loireCheninDemiSec'
  }

  // Jura: ouillé (topped-up) baseline -> sous voile (oxidative) is a different wine.
  if (baseKey === 'juraChardonnayOuille' && (input?.juraStyle ?? '') === 'sousvoile') {
    return 'juraSavagninOxidative'
  }

  // Friuli: conventional white baseline -> skin-contact is a different wine.
  if (baseKey === 'friuliWhite' && (input?.friuliStyle ?? '') === 'skinContact') {
    return 'friuliOrange'
  }

  // Champagne: vintage baseline -> NV measured differently.
  if (baseKey === 'vintageChampagne' && (input?.champagneType ?? '') === 'nv') {
    return 'champagneNVPrestige'
  }

  return baseKey
}
