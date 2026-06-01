import { createClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

const supabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error('Supabase client not initialized. Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY.')
  }
  return supabaseClient
}

export function throwIfError(error: PostgrestError | null) {
  if (error) throw new Error(error.message)
}
