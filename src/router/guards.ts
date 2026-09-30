import { until } from '@vueuse/core'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

/** The slice of the auth store the guard reads. */
export interface AuthGuardState {
  isLoading: boolean
  isLoggedIn: boolean
  isAdmin: boolean
  profileLoaded: boolean
}

/** Longest the guard waits for auth or the profile before treating the user as not admin. */
const WAIT_MS = 5000

export function isAdminRoute(to: RouteLocationNormalized): boolean {
  return to.path === '/manage' || to.path.startsWith('/manage/')
}

/** Login, public-page and admin gating for every navigation. Returns `true` to proceed or a
 *  redirect. The UI hides admin links from non-admins, but the routes themselves are guarded
 *  here too; row-level security remains what actually protects the data. */
export async function authGuard(
  to: RouteLocationNormalized,
  auth: AuthGuardState,
): Promise<true | RouteLocationRaw> {
  if (isAdminRoute(to)) {
    // Never decide on half-loaded state: on a direct load the session and the profile
    // are still being fetched when the first navigation runs.
    await until(() => !auth.isLoading).toBe(true, { timeout: WAIT_MS })
    if (!auth.isLoggedIn) return { name: 'login', query: { redirect: to.fullPath } }
    await until(() => auth.profileLoaded).toBe(true, { timeout: WAIT_MS })
    return auth.isAdmin ? true : { name: 'dashboard' }
  }

  // Wait until auth is resolved before making decisions
  if (auth.isLoading) return true

  const isPublic = to.meta.public === true
  if (!isPublic && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // Already logged in and trying to visit login page
  if (to.name === 'login' && auth.isLoggedIn) return { name: 'dashboard' }

  return true
}
