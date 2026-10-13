// @vitest-environment jsdom
// TEMPORARY: proves the generated Loire SVG with the app's own importer. Delete after the run.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  extractSvgAreaKeys,
  extractSvgLayerElements,
  splitOverlayLayers,
} from '@/lib/svgUtils'

const DIR = '/Users/kaspermol/Desktop/inao-aoc-parcellaire'
const svg = readFileSync(`${DIR}/out/loire-wine-map.svg`, 'utf-8')
const cfg = JSON.parse(readFileSync(`${DIR}/configs/loire.json`, 'utf-8')) as {
  areas: { inao: string; short?: string }[]
}

const label = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase() + ' aoc'

describe('loire wine map svg', () => {
  const keys = extractSvgAreaKeys(svg)

  it('has one unique area key per configured area', () => {
    const expected = cfg.areas.map((a) => label(a.short ?? a.inao))
    console.log('area keys:', keys.length, 'configured:', expected.length)
    expect(new Set(keys).size).toBe(keys.length)
    expect(keys.length).toBe(expected.length)
    expect([...keys].sort()).toEqual([...expected].sort())
  })

  const split = splitOverlayLayers(svg)

  it('splits into water and places overlays only', () => {
    console.log('overlays:', Object.keys(split.overlays))
    expect(Object.keys(split.overlays).sort()).toEqual(['places', 'water'])
    expect(extractSvgAreaKeys(split.baseSvg).length).toBe(keys.length)
  })

  it('has no duplicate overlay element keys', () => {
    for (const kind of ['water', 'places'] as const) {
      const out = extractSvgLayerElements(split.overlays[kind] as string)
      const texts = out.elements.filter((e) => e.type === 'text').length
      const shapes = out.elements.filter((e) => e.type === 'shape').length
      console.log(kind, 'elements:', out.elements.length, 'texts:', texts, 'shapes:', shapes, 'duplicates:', out.duplicateKeys)
      expect(out.duplicateKeys).toEqual([])
      expect(out.elements.length).toBeGreaterThan(0)
    }
  })
})
