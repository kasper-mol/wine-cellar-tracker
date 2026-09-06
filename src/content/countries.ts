/** Editorial copy for the country entries. Not in the schema — `wine_countries`
 * carries no description column, so the blurbs live here and are keyed on the
 * country name (case-insensitive). */
export interface CountryContent {
  officialName: string
  blurb: string
  /** What the country's plate should eventually hold. */
  photographSlot: string
}

const CONTENT: Record<string, CountryContent> = {
  france: {
    officialName: 'République française',
    blurb:
      'From the chalk of Champagne to the schist terraces of the northern Rhône, the French entries are catalogued region by region and appellation by appellation. The register follows the official designation names, and the vintage-rating coverage here is the deepest in the reference data.',
    photographSlot: 'vineyard photograph — Burgundy',
  },
  italy: {
    officialName: 'Repubblica Italiana',
    blurb:
      'Catalogued in the official EU register form, which is why several entries carry their multi-synonym names. Piedmont and Tuscany dominate both the reference data and most cellars; the southern regions are seeded more thinly.',
    photographSlot: 'vineyard photograph — Langhe',
  },
  spain: {
    officialName: 'Reino de España',
    blurb:
      'Tempranillo through its many regional names, from the oak-aged classicism of Rioja to the granite of Bierzo, with the fortified tradition of the south catalogued alongside.',
    photographSlot: 'vineyard photograph — Rioja',
  },
}

export function countryContent(name: string | null | undefined): CountryContent | null {
  if (!name) return null
  return CONTENT[name.trim().toLowerCase()] ?? null
}
