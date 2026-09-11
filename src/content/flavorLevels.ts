import type { FlavorClusterRecord, FlavorLevel } from '@/types/flavorDescriptors'

/** Editorial copy for the three WSET Level 3 aroma/flavour levels. */
interface FlavorLevelCopy {
  title: string
  /** WSET's one-line definition of the level. */
  subtitle: string
  /** The "key questions" WSET asks the taster at this level. */
  questions: string[]
}

const COPY: Record<FlavorLevel, FlavorLevelCopy> = {
  primary: {
    title: 'Primary',
    subtitle: 'The aromas and flavours of the grape and alcoholic fermentation',
    questions: [
      'Are the flavours delicate or intense?',
      'Simple or complex?',
      'Generic or well-defined?',
      'Fresh or cooked?',
      'Under-ripe, ripe or over-ripe?',
    ],
  },
  secondary: {
    title: 'Secondary',
    subtitle: 'The aromas and flavours of post-fermentation winemaking',
    questions: ['Are the flavours from yeast, MLF or oak?'],
  },
  tertiary: {
    title: 'Tertiary',
    subtitle: 'The aromas and flavours of maturation',
    questions: ['Do the flavours show deliberate oxidation, fruit development or bottle age?'],
  },
}

export function flavorLevelCopy(level: FlavorLevel): FlavorLevelCopy {
  return COPY[level]
}

/** "Fruit development (white)" — cluster name with its colour variant, as WSET prints it. */
export function clusterLabel(cluster: Pick<FlavorClusterRecord, 'name' | 'colour'>) {
  return cluster.colour ? `${cluster.name} (${cluster.colour})` : cluster.name
}
