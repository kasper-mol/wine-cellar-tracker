import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import { useMainStore } from '@/stores/main'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const isAdmin = ref(false)
  const isLoading = ref(true)

  const isLoggedIn = computed(() => user.value !== null)
  const displayName = computed(
    () =>
      user.value?.user_metadata?.full_name ??
      user.value?.user_metadata?.name ??
      user.value?.email ??
      null,
  )

  async function fetchProfile(userId: string) {
    const db = getSupabaseClient()
    const { data } = await db.from('profiles').select('is_admin').eq('id', userId).single()
    isAdmin.value = data?.is_admin ?? false
  }

  function init() {
    const db = getSupabaseClient()
    const mainStore = useMainStore()

    db.auth.getSession().then(({ data }) => {
      user.value = data.session?.user ?? null
      isLoading.value = false
      if (user.value) {
        fetchProfile(user.value.id)
        mainStore.loadWines()
      }
    })

    db.auth.onAuthStateChange((_event, session) => {
      const wasLoggedIn = !!user.value
      user.value = session?.user ?? null
      isLoading.value = false

      if (user.value && !wasLoggedIn) {
        fetchProfile(user.value.id)
        mainStore.loadWines()
      } else if (!user.value && wasLoggedIn) {
        isAdmin.value = false
        mainStore.clearWines()
      }
    })
  }

  async function signInWithGoogle() {
    const db = getSupabaseClient()
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw new Error(error.message)
  }

  async function signOut() {
    const db = getSupabaseClient()
    const { error } = await db.auth.signOut()
    if (error) throw new Error(error.message)
    user.value = null
    isAdmin.value = false
  }

  return { user, isAdmin, isLoading, isLoggedIn, displayName, init, signInWithGoogle, signOut }
})
