import { getSupabaseClient, throwIfError } from '@/lib/supabase'
import { hashPassword } from '@/lib/crypto'
import type { UserCreatePayload, UserRecord, UserUpdatePayload } from '@/types/users'

export async function fetchUsers() {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as UserRecord[]
}

export async function createUser(payload: UserCreatePayload) {
  const db = getSupabaseClient()
  const { data, error } = await db
    .from('users')
    .insert({
      email: payload.email.trim().toLowerCase(),
      password_hash: await hashPassword(payload.password),
      display_name: payload.displayName?.trim() || null,
    })
    .select()
    .single()
  throwIfError(error)
  return data as UserRecord
}

export async function updateUser(id: string, payload: UserUpdatePayload) {
  const db = getSupabaseClient()

  const updateBody: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }
  if (payload.email) updateBody.email = payload.email.trim().toLowerCase()
  if (payload.displayName !== undefined) updateBody.display_name = payload.displayName?.trim() || null
  if (payload.password) updateBody.password_hash = await hashPassword(payload.password)

  const { data, error } = await db.from('users').update(updateBody).eq('id', id).select().single()
  throwIfError(error)
  return data as UserRecord
}

export async function deleteUser(id: string) {
  const db = getSupabaseClient()
  const { error } = await db.from('users').delete().eq('id', id)
  throwIfError(error)
}
