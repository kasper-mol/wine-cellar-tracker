import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

let supabaseClient: SupabaseClient | null = null

export function initializeSupabase() {
  if (supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  } else {
    console.warn(
      'Supabase credentials are missing. Populate VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable the client.',
    )
  }
}

export const supabase = supabaseClient

export function getSupabaseClient() {
  if (!supabaseClient) {
    throw new Error(
      'Supabase client not initialized. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    )
  }

  return supabaseClient
}
