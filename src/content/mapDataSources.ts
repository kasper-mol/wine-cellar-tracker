/** A piece of a credit line: plain text, or a link when `href` is set. */
export interface MapCreditPart {
  text: string
  href?: string
}

export interface MapDataSource {
  id: string
  /** The checkbox label on the map's manage page. */
  label: string
  /** What the source covers, shown under the checkbox. */
  description: string
  credit: readonly MapCreditPart[]
}

/**
 * Open-data sources a map can be built from. A map stores only the ids (`data_sources`); the
 * credit line shown under it is built from here, so adding a source needs no migration and a
 * licence wording change is made in one place. Hand-drawn maps tick nothing.
 */
export const MAP_DATA_SOURCES: readonly MapDataSource[] = [
  {
    id: 'inao-fr',
    label: 'Uses French open data',
    description:
      'Appellation boundaries from INAO (Licence Ouverte 2.0); rivers, lakes and villages from OpenStreetMap (ODbL).',
    credit: [
      { text: 'Appellation boundaries © ' },
      {
        text: 'INAO',
        href: 'https://www.data.gouv.fr/datasets/delimitation-parcellaire-des-aoc-viticoles-de-linao',
      },
      { text: ' (Licence Ouverte 2.0) · rivers and villages © ' },
      { text: 'OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
    ],
  },
]
