// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  defaultSubtypeFor,
  extractSvgLayerElements,
  extractSvgAreaKeys,
  namespaceSvgIds,
  parseViewBox,
  sanitizeSvg,
  overlayKindOf,
  splitOverlayLayers,
} from '@/lib/svgUtils'

const NS =
  'xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:xlink="http://www.w3.org/1999/xlink"'

const svg = (inner: string, attrs = 'viewBox="0 0 100 200"') => `<svg ${NS} ${attrs}>${inner}</svg>`

describe('extractSvgLayerElements', () => {
  it('reads texts and shapes from a flat Inkscape layer', () => {
    const { elements, duplicateKeys } = extractSvgLayerElements(
      svg(`
        <sodipodi:namedview id="namedview1"/>
        <defs><path id="in-defs" d="M0 0"/></defs>
        <g inkscape:groupmode="layer" inkscape:label="places" id="layer1">
          <circle id="circle1" cx="10" cy="10" r="2" style="fill:#000000"/>
          <text id="text1" x="12" y="10"><tspan id="tspan1">Bordeaux</tspan></text>
        </g>`),
    )

    expect(elements).toEqual([
      { key: 'circle1', type: 'shape', text: null, hasFill: true },
      { key: 'text1', type: 'text', text: 'Bordeaux', hasFill: true },
    ])
    expect(duplicateKeys).toEqual([])
  })

  it('prefers a lowercased inkscape:label over the id', () => {
    const { elements } = extractSvgLayerElements(
      svg(
        `<path id="path12" inkscape:label=" Loire " d="M0 0 L5 5" style="fill:none;stroke:#000"/>`,
      ),
    )
    expect(elements.map((el) => el.key)).toEqual(['loire'])
  })

  it('tells stroke-only shapes from filled ones, including fill set on a parent', () => {
    const { elements } = extractSvgLayerElements(
      svg(`
        <path id="river" d="M0 0 L5 5" style="fill:none;stroke:#00f"/>
        <path id="lake" d="M0 0 L5 5 Z" style="fill:#00f"/>
        <g fill="none"><path id="river2" d="M0 0 L9 9"/></g>
        <path id="plain" d="M0 0 L9 9"/>`),
    )
    const fills = Object.fromEntries(elements.map((el) => [el.key, el.hasFill]))
    expect(fills).toEqual({ river: false, lake: true, river2: false, plain: true })
  })

  it('joins Inkscape line tspans with a space and collapses whitespace', () => {
    const { elements } = extractSvgLayerElements(
      svg(
        `<text id="t"><tspan sodipodi:role="line" id="l1">Côte</tspan><tspan sodipodi:role="line" id="l2">  d'Or </tspan></text>`,
      ),
    )
    expect(elements[0]?.text).toBe("Côte d'Or")
  })

  it('keeps mid-line tspans together', () => {
    const { elements } = extractSvgLayerElements(
      svg(`<text id="t">Saint-<tspan id="s">Émilion</tspan></text>`),
    )
    expect(elements[0]?.text).toBe('Saint-Émilion')
  })

  it('gives empty text a null value', () => {
    const { elements } = extractSvgLayerElements(svg(`<text id="t"> </text>`))
    expect(elements[0]).toMatchObject({ key: 't', text: null })
  })

  it('skips hidden subtrees and non-rendering containers', () => {
    const { elements } = extractSvgLayerElements(
      svg(`
        <g style="display:none"><path id="hidden-parent-child" d="M0 0"/></g>
        <path id="hidden" style="display:none" d="M0 0"/>
        <clipPath id="clip"><path id="in-clip" d="M0 0"/></clipPath>
        <path id="shown" d="M0 0"/>`),
    )
    expect(elements.map((el) => el.key)).toEqual(['shown'])
  })

  it('reports duplicate keys and keeps the first element', () => {
    const { elements, duplicateKeys } = extractSvgLayerElements(
      svg(`
        <text id="a" inkscape:label="Paris">One</text>
        <text id="b" inkscape:label="paris">Two</text>`),
    )
    expect(elements).toHaveLength(1)
    expect(elements[0]).toMatchObject({ key: 'paris', text: 'One' })
    expect(duplicateKeys).toEqual(['paris'])
  })

  it('throws on a file that is not an SVG', () => {
    expect(() => extractSvgLayerElements('<html><body/></html>')).toThrow('Invalid SVG')
    expect(() => extractSvgLayerElements('not xml at all')).toThrow('Invalid SVG')
  })
})

describe('defaultSubtypeFor', () => {
  it('maps water shapes by fill and leaves everything else open', () => {
    expect(defaultSubtypeFor({ type: 'shape', hasFill: false }, 'water')).toBe('river')
    expect(defaultSubtypeFor({ type: 'shape', hasFill: true }, 'water')).toBe('lake')
    expect(defaultSubtypeFor({ type: 'text', hasFill: true }, 'water')).toBeNull()
    expect(defaultSubtypeFor({ type: 'shape', hasFill: true }, 'places')).toBeNull()
  })
})

describe('parseViewBox', () => {
  it('parses viewBox strings', () => {
    expect(parseViewBox('0 0 1188.9 1368.7')).toEqual({
      minX: 0,
      minY: 0,
      width: 1188.9,
      height: 1368.7,
    })
    expect(parseViewBox('0,0,10,20')).toEqual({ minX: 0, minY: 0, width: 10, height: 20 })
    expect(parseViewBox('0 0 10')).toBeNull()
    expect(parseViewBox('0 0 0 10')).toBeNull()
    expect(parseViewBox(null)).toBeNull()
  })
})

const layer = (label: string, id: string, inner: string, extra = '') =>
  `<g inkscape:groupmode="layer" inkscape:label="${label}" id="${id}" ${extra}>${inner}</g>`

describe('overlayKindOf', () => {
  const el = (markup: string) => {
    const doc = new DOMParser().parseFromString(svg(markup), 'image/svg+xml')
    return doc.documentElement.firstElementChild as Element
  }

  it('recognises layers named water and places in any letter case', () => {
    expect(overlayKindOf(el(layer('places', 'l1', '')))).toBe('places')
    expect(overlayKindOf(el(layer(' Water ', 'l1', '')))).toBe('water')
    expect(overlayKindOf(el(layer('PLACES', 'l1', '')))).toBe('places')
  })

  it('falls back to the id for files saved without Inkscape labels', () => {
    expect(overlayKindOf(el('<g id="places"/>'))).toBe('places')
  })

  it('ignores other groups and non-groups', () => {
    expect(overlayKindOf(el(layer('Beaujolais AOC', 'layer3', '')))).toBeNull()
    expect(overlayKindOf(el('<path id="places" d="M0 0"/>'))).toBeNull()
  })
})

describe('splitOverlayLayers', () => {
  const map = svg(`
    <defs><linearGradient id="grad"/></defs>
    ${layer('Brouilly AOC', 'layer1', '<path id="p1" d="M0 0 L9 9"/>', 'transform="translate(-5,-5)"')}
    ${layer('Places', 'layer2', '<circle id="c1" r="2"/><text id="t1">Anse</text>', 'transform="translate(-5,-5)"')}
    ${layer('water', 'layer3', '<path id="river" d="M0 0 L5 5" style="fill:none"/>')}`)

  it('takes the overlay layers out of the base and returns each as its own svg', () => {
    const { baseSvg, overlays } = splitOverlayLayers(map)

    expect(baseSvg).toContain('id="layer1"')
    expect(baseSvg).not.toContain('Places')
    expect(baseSvg).not.toContain('id="c1"')
    expect(baseSvg).not.toContain('id="river"')

    expect(Object.keys(overlays).sort()).toEqual(['places', 'water'])
    expect(overlays.places).toContain('id="c1"')
    expect(overlays.places).toContain('Anse')
    expect(overlays.places).not.toContain('id="p1"')
    expect(overlays.places).not.toContain('id="river"')
    expect(overlays.water).toContain('id="river"')
    expect(overlays.water).not.toContain('id="c1"')
  })

  it('keeps the page size, definitions and the layer transform in each overlay', () => {
    const { overlays } = splitOverlayLayers(map)
    expect(overlays.places).toContain('viewBox="0 0 100 200"')
    expect(overlays.places).toContain('id="grad"')
    expect(overlays.places).toContain('translate(-5,-5)')
  })

  it('keeps an overlay inside the groups that position it', () => {
    const nested = svg(
      `<g id="outer" transform="scale(2)"><g id="other"><path id="x" d="M0 0"/></g>${layer('places', 'l', '<circle id="c" r="1"/>')}</g>`,
    )
    const { baseSvg, overlays } = splitOverlayLayers(nested)
    expect(overlays.places).toContain('transform="scale(2)"')
    expect(overlays.places).toContain('id="c"')
    expect(overlays.places).not.toContain('id="x"')
    expect(baseSvg).toContain('id="x"')
    expect(baseSvg).not.toContain('id="c"')
  })

  it('returns the file unchanged in substance when there are no overlays', () => {
    const { baseSvg, overlays } = splitOverlayLayers(svg(layer('alsace', 'l1', '<path id="p"/>')))
    expect(overlays).toEqual({})
    expect(baseSvg).toContain('id="p"')
  })

  it('splits what the layer extractor then reads', () => {
    const { overlays } = splitOverlayLayers(map)
    const { elements } = extractSvgLayerElements(overlays.places as string)
    expect(elements.map((element) => element.key)).toEqual(['c1', 't1'])
  })
})

describe('extractSvgAreaKeys', () => {
  it('lists the map areas but not overlay layers or definitions', () => {
    const keys = extractSvgAreaKeys(
      svg(`
        <defs><rect id="rect29" width="1" height="1"/><clipPath id="cp"><rect id="rect30"/></clipPath></defs>
        ${layer('Alsace', 'layer1', '<path id="path1" d="M0 0"/>')}
        ${layer('Places', 'layer2', '<circle id="circle1" r="1"/><rect id="rect31" width="2" height="2"/>')}
        ${layer('Water', 'layer3', '<path id="river" d="M0 0"/>')}`),
    )
    expect(keys).toEqual(['alsace'])
  })
})

describe('namespaceSvgIds', () => {
  it('prefixes ids and every reference to them', () => {
    const out = namespaceSvgIds(
      svg(`
        <defs>
          <linearGradient id="grad"/>
          <clipPath id="clip"><path id="shape" d="M0 0"/></clipPath>
          <path id="curve" d="M0 0 C 5 5 9 9 20 20"/>
        </defs>
        <path id="p1" fill="url(#grad)" clip-path="url('#clip')" style="stroke:url(#grad)" d="M0 0"/>
        <text id="t"><textPath xlink:href="#curve">Loire</textPath></text>
        <use href="#shape"/>`),
      'water-',
    )

    expect(out).toContain('id="water-grad"')
    expect(out).toContain('id="water-p1"')
    expect(out).toContain('fill="url(#water-grad)"')
    expect(out).toContain(`clip-path="url('#water-clip')"`)
    expect(out).toContain('stroke:url(#water-grad)')
    expect(out).toContain('xlink:href="#water-curve"')
    expect(out).toContain('href="#water-shape"')
    expect(out).not.toMatch(/id="(grad|clip|shape|curve|p1|t)"/)
  })

  it('keeps Inkscape namespaces and labels intact', () => {
    const out = namespaceSvgIds(svg(`<path id="a" inkscape:label="Loire" d="M0 0"/>`), 'x-')
    expect(out).toContain('inkscape:label="Loire"')
  })
})

describe('sanitizeSvg', () => {
  it('removes scripts, foreign content, styles and animations', () => {
    const out = sanitizeSvg(
      svg(`
        <script>alert(1)</script>
        <foreignObject><div>hi</div></foreignObject>
        <style>text{display:none}</style>
        <path id="ok" d="M0 0"><animate attributeName="d" to="M1 1"/><set attributeName="href" to="x"/></path>`),
    )
    expect(out).not.toMatch(/script|foreignObject|<style|animate|<set/i)
    expect(out).toContain('id="ok"')
  })

  it('removes event handlers and non-local links', () => {
    const out = sanitizeSvg(
      svg(`
        <path id="a" onclick="alert(1)" onmouseover="alert(2)" d="M0 0"/>
        <a id="b" href="javascript:alert(1)"><path id="c" d="M0 0"/></a>
        <a id="d" xlink:href=" JaVa&#x09;script:alert(1)"><path id="e" d="M0 0"/></a>
        <a id="f" href="https://example.com"><path id="g" d="M0 0"/></a>
        <use id="h" href="#a"/>`),
    )
    expect(out).not.toMatch(/onclick|onmouseover|javascript|example\.com/i)
    expect(out).toContain('href="#a"')
  })

  it('keeps ordinary drawing content untouched', () => {
    const input = svg(
      `<g inkscape:groupmode="layer" inkscape:label="alsace"><path id="p" d="M0 0 L5 5" style="fill:#000"/></g>`,
    )
    const out = sanitizeSvg(input)
    expect(out).toContain('inkscape:label="alsace"')
    expect(out).toContain('d="M0 0 L5 5"')
    expect(out).toContain('style="fill:#000"')
  })
})
