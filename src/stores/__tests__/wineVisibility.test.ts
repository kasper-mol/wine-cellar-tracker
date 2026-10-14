import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { appellation, region } from '@/lib/__tests__/fixtures'
import type { WineRegionUpdatePayload } from '@/types/wineRegions'

const mocks = vi.hoisted(() => ({
  fetchWineRegions: vi.fn(),
  updateWineRegion: vi.fn(),
  fetchWineAppellations: vi.fn(),
  updateWineAppellation: vi.fn(),
}))

vi.mock('@/services/wineRegions', () => ({
  fetchWineRegions: mocks.fetchWineRegions,
  createWineRegion: vi.fn(),
  updateWineRegion: mocks.updateWineRegion,
  deleteWineRegion: vi.fn(),
}))
vi.mock('@/services/wineAppellations', () => ({
  fetchWineAppellations: mocks.fetchWineAppellations,
  createWineAppellation: vi.fn(),
  updateWineAppellation: mocks.updateWineAppellation,
  deleteWineAppellation: vi.fn(),
}))

const { useWineRegionsStore } = await import('@/stores/wineRegions')
const { useWineAppellationsStore } = await import('@/stores/wineAppellations')

const bordeaux = region('bordeaux', { name: 'Bordeaux' })
const alsace = region('alsace', { name: 'Alsace' })
const regionRows = [bordeaux, alsace]
const appellationRows = [
  appellation('margaux', ['red'], { name: 'Margaux', region_id: 'bordeaux', region: bordeaux }),
  appellation('pauillac', ['red'], {
    name: 'Pauillac',
    region_id: 'bordeaux',
    region: bordeaux,
    is_active: false,
  }),
  appellation('riesling', ['white'], { name: 'Riesling', region_id: 'alsace', region: alsace }),
]

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mocks.fetchWineRegions.mockResolvedValue(regionRows)
  mocks.fetchWineAppellations.mockResolvedValue(appellationRows)
  mocks.updateWineRegion.mockImplementation(
    async (id: string, payload: WineRegionUpdatePayload) => ({
      ...regionRows.find((r) => r.id === id)!,
      ...payload,
    }),
  )
})

async function loaded() {
  const regions = useWineRegionsStore()
  const appellations = useWineAppellationsStore()
  await Promise.all([regions.loadAll(), appellations.loadAll()])
  return { regions, appellations }
}

const ids = (list: { id: string }[]) => list.map((item) => item.id)

describe('region and appellation visibility', () => {
  it('shows only active entries publicly, and everything in allRegions / allAppellations', async () => {
    const { regions, appellations } = await loaded()

    expect(ids(regions.regions)).toEqual(['alsace', 'bordeaux'])
    expect(ids(appellations.allAppellations).sort()).toEqual(['margaux', 'pauillac', 'riesling'])
    expect(ids(appellations.appellations).sort()).toEqual(['margaux', 'riesling'])
  })

  it('hides a region and its appellations without touching the appellation flags, and restores them', async () => {
    const { regions, appellations } = await loaded()

    await regions.setActive('bordeaux', false)
    expect(ids(regions.regions)).toEqual(['alsace'])
    expect(ids(appellations.appellations)).toEqual(['riesling'])
    // The flags themselves are untouched: margaux is still on, pauillac still off.
    expect(appellations.allAppellations.map((a) => [a.id, a.is_active]).sort()).toEqual([
      ['margaux', true],
      ['pauillac', false],
      ['riesling', true],
    ])

    await regions.setActive('bordeaux', true)
    expect(ids(regions.regions)).toEqual(['alsace', 'bordeaux'])
    // margaux is back; pauillac stays hidden because it was switched off on its own.
    expect(ids(appellations.appellations).sort()).toEqual(['margaux', 'riesling'])
  })

  it('switches an appellation on and off through the update service', async () => {
    const { appellations } = await loaded()
    mocks.updateWineAppellation.mockImplementation(
      async (id: string, payload: { is_active?: boolean }) => ({
        ...appellationRows.find((a) => a.id === id)!,
        ...payload,
      }),
    )

    await appellations.setActive('pauillac', true)
    expect(mocks.updateWineAppellation).toHaveBeenCalledWith('pauillac', { is_active: true })
    expect(ids(appellations.appellations).sort()).toEqual(['margaux', 'pauillac', 'riesling'])

    await appellations.setActive('margaux', false)
    expect(ids(appellations.appellations).sort()).toEqual(['pauillac', 'riesling'])
  })

  it('reports loaded only after a load finishes', async () => {
    const regions = useWineRegionsStore()
    expect(regions.loaded).toBe(false)
    await regions.loadAll()
    expect(regions.loaded).toBe(true)
  })
})
