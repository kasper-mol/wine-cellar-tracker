// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { prepareOverlayMarkup, styleOverlay } from '@/lib/wineMapOverlay'
import type { WineMapLayerElementDto, WineMapOverlayKind } from '@/types/wineMaps'

const NS =
  'xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"'

function mount(kind: WineMapOverlayKind, inner: string) {
  const host = document.createElement('div')
  host.innerHTML = prepareOverlayMarkup(
    `<svg ${NS} viewBox="0 0 100 200"><g inkscape:groupmode="layer" id="layer1">${inner}</g></svg>`,
    kind,
  )
  return host
}

const row = (overrides: Partial<WineMapLayerElementDto> & { svgElementId: string }) => ({
  dotSvgElementId: null,
  displayText: null,
  subtype: null,
  sizeClass: 'md' as const,
  isVisible: true,
  ...overrides,
})

function css(host: Element, selector: string, prop: string) {
  const el = host.querySelector(selector)
  const match = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]*)`).exec(
    el?.getAttribute('style') ?? '',
  )
  return match ? (match[1] as string).trim() : null
}

describe('prepareOverlayMarkup', () => {
  it('prefixes ids by layer kind and strips scripts', () => {
    const host = mount('water', `<script>alert(1)</script><path id="p1" d="M0 0" onclick="x()"/>`)
    expect(host.querySelector('#ov-water-p1')).not.toBeNull()
    expect(host.querySelector('script')).toBeNull()
    expect(host.querySelector('path')?.hasAttribute('onclick')).toBe(false)
  })
})

describe('styleOverlay: water', () => {
  const water = `
    <path id="loire" d="M0 0 L9 9" style="fill:none;stroke:#000000;stroke-width:2.5"/>
    <path id="lac" d="M0 0 L9 9 Z" style="fill:#000000"/>
    <text id="t1" x="5" y="5" style="font-size:8px;fill:#000"><tspan id="ts1" style="font-size:8px">Loire</tspan></text>`

  it('draws unfilled shapes as rivers and filled ones as water', () => {
    const host = mount('water', water)
    styleOverlay(host, { kind: 'water', elements: [] })

    expect(css(host, '#ov-water-loire', 'fill')).toBe('none')
    expect(css(host, '#ov-water-loire', 'stroke')).toBe('var(--water-500)')
    expect(css(host, '#ov-water-loire', 'stroke-width')).toBe('2.5')
    expect(css(host, '#ov-water-lac', 'fill')).toBe('var(--water-300)')
    expect(css(host, '#ov-water-lac', 'stroke-width')).toBe('0.75')
  })

  it('lets a row override the guessed subtype', () => {
    const host = mount('water', water)
    styleOverlay(host, {
      kind: 'water',
      elements: [
        row({ svgElementId: 'lac', subtype: 'river' }),
        row({ svgElementId: 'loire', subtype: 'lake' }),
      ],
    })
    expect(css(host, '#ov-water-lac', 'fill')).toBe('none')
    expect(css(host, '#ov-water-loire', 'fill')).toBe('var(--water-300)')
  })

  it('hides a shape when its row is not visible, and shows it again later', () => {
    const host = mount('water', water)
    styleOverlay(host, {
      kind: 'water',
      elements: [row({ svgElementId: 'loire', isVisible: false })],
    })
    expect(css(host, '#ov-water-loire', 'visibility')).toBe('hidden')

    styleOverlay(host, { kind: 'water', elements: [row({ svgElementId: 'loire' })] })
    expect(css(host, '#ov-water-loire', 'visibility')).toBeNull()
  })

  it('sets river names small and italic in water colour', () => {
    const host = mount('water', water)
    styleOverlay(host, { kind: 'water', elements: [] })

    expect(css(host, '#ov-water-t1', 'font-style')).toBe('italic')
    expect(css(host, '#ov-water-t1', 'fill')).toBe('var(--water-700)')
    expect(css(host, '#ov-water-t1', 'font-size')).toBe('8px')
    expect(css(host, '#ov-water-ts1', 'font-size')).toBe('8px')
  })

  it('is stable when run again and does not keep the shape-level changes of the first pass', () => {
    const host = mount('water', water)
    styleOverlay(host, { kind: 'water', elements: [] })
    const once = host.innerHTML
    styleOverlay(host, { kind: 'water', elements: [] })
    expect(host.innerHTML).toBe(once)
    // the stroke-only river is still a river on the second pass although fill is now "none"
    expect(css(host, '#ov-water-loire', 'fill')).toBe('none')
    expect(css(host, '#ov-water-lac', 'fill')).toBe('var(--water-300)')
  })
})

describe('styleOverlay: text', () => {
  const twoLines = `<text id="t1" style="font-size:10px"><tspan sodipodi:role="line" id="a" x="1" y="1" style="font-size:10px">Côte</tspan><tspan sodipodi:role="line" id="b" x="1" y="11" style="font-size:10px">d'Or</tspan></text>`

  it('leaves the text alone when the row repeats what the file says', () => {
    const host = mount('places', twoLines)
    const before = host.querySelectorAll('tspan').length
    styleOverlay(host, {
      kind: 'places',
      elements: [row({ svgElementId: 't1', displayText: "Côte d'Or" })],
    })
    expect(host.querySelectorAll('tspan')).toHaveLength(before)
  })

  it('replaces the text in the first line and drops the others', () => {
    const host = mount('places', twoLines)
    styleOverlay(host, {
      kind: 'places',
      elements: [row({ svgElementId: 't1', displayText: 'Burgundy' })],
    })

    const tspans = host.querySelectorAll('tspan')
    expect(tspans).toHaveLength(1)
    expect(tspans[0]?.textContent).toBe('Burgundy')
    expect(tspans[0]?.getAttribute('y')).toBe('1')
  })

  it('restores the original text when the override is cleared', () => {
    const host = mount('places', twoLines)
    styleOverlay(host, {
      kind: 'places',
      elements: [row({ svgElementId: 't1', displayText: 'Burgundy' })],
    })
    styleOverlay(host, {
      kind: 'places',
      elements: [row({ svgElementId: 't1', displayText: null })],
    })

    const tspans = host.querySelectorAll('tspan')
    expect(tspans).toHaveLength(2)
    expect(tspans[1]?.textContent).toBe("d'Or")
  })

  it('replaces plain text without tspans', () => {
    const host = mount('places', `<text id="t1">Old</text>`)
    styleOverlay(host, {
      kind: 'places',
      elements: [row({ svgElementId: 't1', displayText: 'New' })],
    })
    expect(host.querySelector('text')?.textContent).toBe('New')
  })

  it('scales font sizes by size class without compounding, and keeps non-px sizes', () => {
    const host = mount(
      'places',
      `<text id="t1" style="font-size:10px"><tspan id="a" style="font-size:10px">A</tspan></text><text id="t2" style="font-size:1.5em">B</text>`,
    )
    styleOverlay(host, { kind: 'places', elements: [row({ svgElementId: 't1', sizeClass: 'lg' })] })
    expect(css(host, '#ov-places-t1', 'font-size')).toBe('12px')
    expect(css(host, '#ov-places-a', 'font-size')).toBe('12px')

    styleOverlay(host, { kind: 'places', elements: [row({ svgElementId: 't1', sizeClass: 'sm' })] })
    expect(css(host, '#ov-places-t1', 'font-size')).toBe('8.5px')

    expect(css(host, '#ov-places-t2', 'font-size')).toBe('1.5em')
  })
})

describe('styleOverlay: places', () => {
  const places = `
    <circle id="d1" cx="10" cy="10" r="4" style="fill:#000000"/>
    <circle id="d2" cx="30" cy="10" r="4" style="fill:#000000"/>
    <text id="t1" x="14" y="12" style="font-size:9px">Bordeaux</text>
    <text id="t2" x="34" y="12" style="font-size:9px">Lyon</text>`

  const rows = [
    row({ svgElementId: 't1', dotSvgElementId: 'd1' }),
    row({ svgElementId: 't2', dotSvgElementId: 'd2' }),
  ]

  it('styles dots and names in the places colours', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: rows })

    expect(css(host, '#ov-places-d1', 'fill')).toBe('var(--accent-700)')
    expect(css(host, '#ov-places-t1', 'fill')).toBe('var(--neutral-700)')
    expect(css(host, '#ov-places-t1', 'font-family')).toBe('var(--font-heading)')
    expect(css(host, '#ov-places-t1', 'paint-order')).toBe('stroke')
    expect(css(host, '#ov-places-t1', 'font-style')).toBe('normal')
  })

  it('hides a dot together with its name', () => {
    const host = mount('places', places)
    styleOverlay(host, {
      kind: 'places',
      elements: [
        row({ svgElementId: 't1', dotSvgElementId: 'd1', isVisible: false }),
        rows[1] as WineMapLayerElementDto,
      ],
    })

    expect(css(host, '#ov-places-t1', 'visibility')).toBe('hidden')
    expect(css(host, '#ov-places-d1', 'visibility')).toBe('hidden')
    expect(css(host, '#ov-places-t2', 'visibility')).toBeNull()
    expect(css(host, '#ov-places-d2', 'visibility')).toBeNull()
  })

  it('sizes a dot with its name and does not compound on re-runs', () => {
    const host = mount('places', places)
    const large = [
      row({ svgElementId: 't1', dotSvgElementId: 'd1', sizeClass: 'lg' as const }),
      rows[1] as WineMapLayerElementDto,
    ]

    styleOverlay(host, { kind: 'places', elements: large })
    styleOverlay(host, { kind: 'places', elements: large })
    expect(host.querySelector('#ov-places-d1')?.getAttribute('r')).toBe('4.8')
    expect(host.querySelector('#ov-places-d2')?.getAttribute('r')).toBe('4')

    styleOverlay(host, { kind: 'places', elements: rows })
    expect(host.querySelector('#ov-places-d1')?.getAttribute('r')).toBe('4')
  })

  it('leaves unpaired dots visible with default styling', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: [rows[0] as WineMapLayerElementDto] })

    expect(css(host, '#ov-places-d2', 'visibility')).toBeNull()
    expect(css(host, '#ov-places-d2', 'fill')).toBe('var(--accent-700)')
  })

  it('scales non-circular dots with a transform unless they already have one', () => {
    const host = mount(
      'places',
      `<path id="p1" d="M0 0 L4 0 L4 4 Z"/><path id="p2" transform="translate(5,5)" d="M0 0 L4 0 L4 4 Z"/>
       <text id="t1">A</text><text id="t2">B</text>`,
    )
    styleOverlay(host, {
      kind: 'places',
      elements: [
        row({ svgElementId: 't1', dotSvgElementId: 'p1', sizeClass: 'lg' }),
        row({ svgElementId: 't2', dotSvgElementId: 'p2', sizeClass: 'lg' }),
      ],
    })
    expect(css(host, '#ov-places-p1', 'transform')).toBe('scale(1.2)')
    expect(css(host, '#ov-places-p2', 'transform')).toBeNull()
  })

  it('makes the overlay svg fill its box and invisible to assistive tech', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: [] })
    const svg = host.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(css(host, 'svg', 'width')).toBe('100%')
    expect(css(host, 'svg', 'height')).toBe('auto')
  })
})

describe('styleOverlay: zoomAware', () => {
  const places = `
    <circle id="d1" cx="10" cy="10" r="4" style="fill:#000000"/>
    <text id="t1" x="14" y="12" style="font-size:10px"><tspan id="a" style="font-size:10px">Bordeaux</tspan></text>`
  const rows = [row({ svgElementId: 't1', dotSvgElementId: 'd1', sizeClass: 'lg' as const })]

  it('sizes names, halos and dots by the map zoom variable', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: rows, zoomAware: true })

    expect(css(host, '#ov-places-t1', 'font-size')).toBe('calc(12px * var(--map-label-scale, 1))')
    expect(css(host, '#ov-places-a', 'font-size')).toBe('calc(12px * var(--map-label-scale, 1))')
    expect(css(host, '#ov-places-t1', 'stroke-width')).toBe(
      'calc(2.64px * var(--map-label-scale, 1))',
    )
    expect(css(host, '#ov-places-d1', 'r')).toBe('calc(4.8px * var(--map-label-scale, 1))')
    expect(css(host, '#ov-places-d1', 'stroke-width')).toBe(
      'calc(1.68px * var(--map-label-scale, 1))',
    )
    // The attribute keeps the drawn size, for code that reads it.
    expect(host.querySelector('#ov-places-d1')?.getAttribute('r')).toBe('4.8')
  })

  it('does not compound on re-runs', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: rows, zoomAware: true })
    styleOverlay(host, { kind: 'places', elements: rows, zoomAware: true })
    expect(css(host, '#ov-places-t1', 'font-size')).toBe('calc(12px * var(--map-label-scale, 1))')
    expect(css(host, '#ov-places-d1', 'r')).toBe('calc(4.8px * var(--map-label-scale, 1))')
  })

  it('is off by default', () => {
    const host = mount('places', places)
    styleOverlay(host, { kind: 'places', elements: rows })
    expect(css(host, '#ov-places-t1', 'font-size')).toBe('12px')
    expect(css(host, '#ov-places-d1', 'r')).toBeNull()
  })
})
