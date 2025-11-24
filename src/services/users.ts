import type { PostgrestError } from '@supabase/supabase-js'

import { hashPassword } from '@/lib/crypto'
import { getSupabaseClient } from '@/lib/supabase'

export interface UserRecord {
  id: string
  email: string
  password_hash: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface CreateUserPayload {
  email: string
  password: string
  displayName?: string | null
}

export interface UpdateUserPayload {
  email?: string
  displayName?: string | null
  password?: string
}

function throwIfError(error: PostgrestError | null) {
  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchUsers() {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error)
  return (data ?? []) as UserRecord[]
}

export async function createUser(payload: CreateUserPayload) {
  const client = getSupabaseClient()
  const hashedPassword = await hashPassword(payload.password)
  const sanitizedEmail = payload.email.trim().toLowerCase()
  const displayName = payload.displayName?.trim() || null

  const { data, error } = await client
    .from('users')
    .insert({
      email: sanitizedEmail,
      password_hash: hashedPassword,
      display_name: displayName,
    })
    .select()
    .single()

  throwIfError(error)
  return data as UserRecord
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const client = getSupabaseClient()

  const updateBody: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.email) {
    updateBody.email = payload.email.trim().toLowerCase()
  }
  if (payload.displayName !== undefined) {
    updateBody.display_name = payload.displayName?.trim() || null
  }
  if (payload.password) {
    updateBody.password_hash = await hashPassword(payload.password)
  }

  const { data, error } = await client
    .from('users')
    .update(updateBody)
    .eq('id', id)
    .select()
    .single()
  throwIfError(error)
  return data as UserRecord
}

export async function deleteUser(id: string) {
  const client = getSupabaseClient()
  const { error } = await client.from('users').delete().eq('id', id)
  throwIfError(error)
}
