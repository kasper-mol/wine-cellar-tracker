import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import type { AdminProfileRow } from '@/types/profiles'

/** Admin-only — the RPC itself rejects non-admin callers. */
export async function fetchAdminProfiles(): Promise<AdminProfileRow[]> {
  const db = getSupabaseClient()
  const { data, error } = await db.rpc('admin_list_profiles')
  throwIfError(error)
  return (data ?? []) as AdminProfileRow[]
}

/** Admin-only — a `prevent_privilege_self_escalation` DB trigger rejects
 *  this from anyone whose own profile isn't is_admin. */
export async function setCanScanLabels(userId: string, value: boolean): Promise<void> {
  const db = getSupabaseClient()
  const { error } = await db.from('profiles').update({ can_scan_labels: value }).eq('id', userId)
  throwIfError(error)
}
