import franceMapSvg from '@/assets/france_svg.svg?raw'

export type CountryMapRegion = {
  key: string
  label: string
  displayName: string
}

export type CountryMapConfig = {
  svg: string
  defaultFill: string
  highlight?: {
    fill?: string
    stroke?: string
  }
  borderLayer?: {
    label: string
    fill?: string
    stroke?: string
  }
  regionNames?: Record<string, string>
  regionColors?: Record<string, string>
}

export const countryMapConfig: Record<string, CountryMapConfig> = {
  france: {
    svg: franceMapSvg,
    defaultFill: '#e9b3b3',
    highlight: {
      fill: '#dc2c2c',
      stroke: '#000000',
    },
    borderLayer: {
      label: 'country-border',
      fill: 'none',
      stroke: '#000000',
    },
  },
}
