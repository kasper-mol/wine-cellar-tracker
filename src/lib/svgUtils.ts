export function normalizeSvgKey(value: string): string {
  return value.trim().toLowerCase()
}

function isGenericSvgId(value: string): boolean {
  const n = normalizeSvgKey(value)
  return /^layer\d+$/.test(n) || /^path\d+$/.test(n) || /^g\d+$/.test(n)
}

function pickSvgAreaKey(el: Element): string | null {
  const label = el.getAttribute('inkscape:label') || el.getAttribute('label')
  const id = el.getAttribute('id')

  if (label && normalizeSvgKey(label).length > 0) return normalizeSvgKey(label)
  if (id && normalizeSvgKey(id).length > 0 && !isGenericSvgId(id)) return normalizeSvgKey(id)
  return null
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to load SVG from ${url}`)
  return response.text()
}

export function extractSvgAreaKeys(svgText: string): string[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const keys = new Set<string>()

  for (const el of Array.from(doc.querySelectorAll('*'))) {
    const groupMode = el.getAttribute('inkscape:groupmode')
    const hasLabel = Boolean(el.getAttribute('inkscape:label') || el.getAttribute('label'))
    const tag = el.tagName.toLowerCase()

    const isLayer = groupMode === 'layer' && hasLabel
    const isDirectShape = ['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(tag)
    if (!isLayer && !isDirectShape) continue

    const key = pickSvgAreaKey(el)
    if (key) keys.add(key)
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}
