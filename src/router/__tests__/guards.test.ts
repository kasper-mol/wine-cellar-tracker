import { afterEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import { authGuard, isAdminRoute } from '@/router/guards'
import type { AuthGuardState } from '@/router/guards'

function route(path: string, extra: Partial<RouteLocationNormalized> = {}) {
  return { path, fullPath: path, name: undefined, meta: {}, ...extra } as RouteLocationNormalized
}

function auth(state: Partial<AuthGuardState> = {}) {
  return reactive<AuthGuardState>({
    isLoading: false,
    isLoggedIn: true,
    isAdmin: false,
    profileLoaded: true,
    ...state,
  })
}

/** Whether a promise has settled yet, without waiting on it. */
async function settled(promise: Promise<unknown>) {
  let done = false
  void promise.then(() => (done = true))
  await Promise.resolve()
  await Promise.resolve()
  return done
}

afterEach(() => {
  vi.useRealTimers()
})

describe('isAdminRoute', () => {
  it('covers /manage and everything under it, and nothing else', () => {
    expect(isAdminRoute(route('/manage'))).toBe(true)
    expect(isAdminRoute(route('/manage/food-pairing/tags'))).toBe(true)
    expect(isAdminRoute(route('/manage/wine-maps/123'))).toBe(true)
    expect(isAdminRoute(route('/managers'))).toBe(false)
    expect(isAdminRoute(route('/pairing'))).toBe(false)
    expect(isAdminRoute(route('/'))).toBe(false)
  })
})

describe('authGuard on admin routes', () => {
  const to = route('/manage/food-pairing/tags')

  it('lets an admin through', async () => {
    expect(await authGuard(to, auth({ isAdmin: true }))).toBe(true)
  })

  it('sends a signed-in non-admin to the dashboard', async () => {
    expect(await authGuard(to, auth({ isAdmin: false }))).toEqual({ name: 'dashboard' })
  })

  it('sends a signed-out visitor to login, remembering where they were headed', async () => {
    expect(await authGuard(to, auth({ isLoggedIn: false }))).toEqual({
      name: 'login',
      query: { redirect: '/manage/food-pairing/tags' },
    })
  })

  it('waits for auth to resolve instead of letting a direct load through', async () => {
    const state = auth({ isLoading: true, isLoggedIn: false, profileLoaded: false })
    const pending = authGuard(to, state)
    expect(await settled(pending)).toBe(false)

    state.isLoggedIn = true
    state.isAdmin = true
    state.profileLoaded = true
    state.isLoading = false
    expect(await pending).toBe(true)
  })

  it('waits for the profile: signed in but is_admin not read yet is neither allowed nor denied', async () => {
    const state = auth({ isAdmin: false, profileLoaded: false })
    const pending = authGuard(to, state)
    expect(await settled(pending)).toBe(false)

    state.isAdmin = true
    state.profileLoaded = true
    expect(await pending).toBe(true)
  })

  it('denies a non-admin once the profile has loaded', async () => {
    const state = auth({ isAdmin: false, profileLoaded: false })
    const pending = authGuard(to, state)
    state.profileLoaded = true // profile read: not an admin
    expect(await pending).toEqual({ name: 'dashboard' })
  })

  it('gives up waiting after a timeout and treats the visitor as not admin', async () => {
    vi.useFakeTimers()
    const stuckAuth = authGuard(to, auth({ isLoading: true, isLoggedIn: false }))
    await vi.advanceTimersByTimeAsync(5000)
    expect(await stuckAuth).toMatchObject({ name: 'login' })

    const stuckProfile = authGuard(to, auth({ profileLoaded: false, isAdmin: false }))
    await vi.advanceTimersByTimeAsync(5000)
    expect(await stuckProfile).toEqual({ name: 'dashboard' })
  })
})

describe('authGuard on other routes (unchanged behaviour)', () => {
  it('lets everything through while auth is still resolving', async () => {
    const state = auth({ isLoading: true, isLoggedIn: false })
    expect(await authGuard(route('/cellar/add'), state)).toBe(true)
  })

  it('sends a signed-out visitor from a private page to login', async () => {
    expect(await authGuard(route('/cellar/add'), auth({ isLoggedIn: false }))).toEqual({
      name: 'login',
      query: { redirect: '/cellar/add' },
    })
  })

  it('leaves public pages open to visitors', async () => {
    const pairing = route('/pairing', { meta: { public: true } })
    expect(await authGuard(pairing, auth({ isLoggedIn: false }))).toBe(true)
  })

  it('keeps a signed-in user off the login page', async () => {
    const login = route('/login', { name: 'login', meta: { public: true } })
    expect(await authGuard(login, auth())).toEqual({ name: 'dashboard' })
  })

  it('lets a non-admin use ordinary private pages', async () => {
    expect(await authGuard(route('/'), auth({ isAdmin: false }))).toBe(true)
  })
})
