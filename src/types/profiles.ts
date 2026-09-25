/** Row shape returned by the admin_list_profiles() RPC — admin-only, joins
 *  auth.users for email since RLS/PostgREST can't reach that schema directly. */
export interface AdminProfileRow {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  can_scan_labels: boolean
  created_at: string
}
