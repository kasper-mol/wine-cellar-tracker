<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import MenuBar from './components/MenuBar.vue'

const supabaseWarning = ref<string | null>(null)
const authStore = useAuthStore()

onMounted(() => {
  try {
    getSupabaseClient()
    authStore.init()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase configuration missing.'
    supabaseWarning.value = message
  }
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <header class="border-b bg-card/50 backdrop-blur">
      <div class="container flex flex-wrap items-center justify-between gap-4 py-4">
        <RouterLink class="text-lg font-semibold tracking-tight" to="/">Cellar Tracker</RouterLink>
        <MenuBar />
      </div>
    </header>
    <main class="container py-10">
      <div
        v-if="supabaseWarning"
        class="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {{ supabaseWarning }}
      </div>

      <RouterView v-if="!supabaseWarning" />
    </main>
  </div>
</template>
