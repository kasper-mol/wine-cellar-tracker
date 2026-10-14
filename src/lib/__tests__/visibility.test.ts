import { describe, expect, it } from 'vitest'
import { isAppellationVisible, isRegionVisible } from '@/lib/visibility'
import { appellation, region } from '@/lib/__tests__/fixtures'

describe('isRegionVisible', () => {
  it('follows the region flag', () => {
    expect(isRegionVisible(region('r'))).toBe(true)
    expect(isRegionVisible(region('r', { is_active: false }))).toBe(false)
  })
})

describe('isAppellationVisible', () => {
  it('hides an appellation that is switched off', () => {
    const app = appellation('a', ['red'], { is_active: false, region: region('r') })
    expect(isAppellationVisible(app)).toBe(false)
  })

  it('hides an active appellation whose embedded region is switched off', () => {
    const app = appellation('a', ['red'], { region: region('r', { is_active: false }) })
    expect(isAppellationVisible(app)).toBe(false)
  })

  it('shows an active appellation in an active region', () => {
    const app = appellation('a', ['red'], { region: region('r') })
    expect(isAppellationVisible(app)).toBe(true)
  })

  it('prefers the live region row over the stale embedded copy', () => {
    const app = appellation('a', ['red'], { region: region('r') })
    expect(isAppellationVisible(app, region('r', { is_active: false }))).toBe(false)

    const stale = appellation('b', ['red'], { region: region('r', { is_active: false }) })
    expect(isAppellationVisible(stale, region('r'))).toBe(true)
  })

  it('falls back to its own flag when no region is known', () => {
    expect(isAppellationVisible(appellation('a', ['red']))).toBe(true)
    expect(isAppellationVisible(appellation('a', ['red'], { region: null }))).toBe(true)
  })
})
