<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

import { getSupabaseClient, initializeSupabase } from '@/lib/supabase'
import MenuBar from './components/MenuBar.vue'

const supabaseReady = ref(false)
const supabaseWarning = ref<string | null>(null)

onMounted(() => {
  initializeSupabase()

  try {
    getSupabaseClient()
    supabaseReady.value = true
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

      <RouterView v-if="supabaseReady" />
      <div v-else class="rounded-xl border bg-card p-8 text-center text-muted-foreground">
        Connecting to Supabase...
      </div>
    </main>
  </div>
</template>
