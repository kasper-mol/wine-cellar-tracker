<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { storeToRefs } from 'pinia'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { useWineCountriesStore } from '@/stores/wineCountries'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { toRoman } from '@/lib/numberToWords'
import MenuBar from './components/MenuBar.vue'

const supabaseWarning = ref<string | null>(null)
const authStore = useAuthStore()
const wineCountriesStore = useWineCountriesStore()
const wineAppellationsStore = useWineAppellationsStore()
const wineGrapeVarietiesStore = useWineGrapeVarietiesStore()

const { countries } = storeToRefs(wineCountriesStore)
const { appellations } = storeToRefs(wineAppellationsStore)
const { grapeVarieties } = storeToRefs(wineGrapeVarietiesStore)

/** The colophon reads from whatever the page has already loaded. */
const colophon = computed(() => {
  const parts: string[] = []
  if (countries.value.length) parts.push(countries.value.map((c) => c.name).join(' & '))
  if (appellations.value.length) parts.push(`${appellations.value.length} appellations`)
  if (grapeVarieties.value.length) parts.push(`${grapeVarieties.value.length} grapes`)
  return parts.join(' · ')
})

const romanYear = computed(() => toRoman(new Date().getFullYear()))

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
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <header class="border-b border-border">
      <div class="mx-auto flex max-w-[1180px] items-baseline gap-8 px-6 py-4">
        <RouterLink
          class="mr-auto font-heading text-[23px] tracking-[0.02em] text-foreground"
          to="/"
        >
          Cellar&nbsp;Tracker
        </RouterLink>
        <MenuBar />
      </div>
    </header>

    <main class="mx-auto w-full max-w-[1180px] flex-1 px-6 pb-[120px] pt-8">
      <div
        v-if="supabaseWarning"
        class="mb-6 border-l-2 border-destructive py-2 pl-3 text-[13px] text-destructive"
      >
        {{ supabaseWarning }}
      </div>

      <RouterView v-if="!supabaseWarning" />
    </main>

    <footer class="border-t-[3px] border-double border-border">
      <div
        class="mx-auto flex max-w-[1180px] justify-between gap-4 px-6 py-4 text-[11px] uppercase tracking-[0.1em] text-foreground/45"
      >
        <span>Cellar Tracker</span>
        <span>{{ colophon }}</span>
        <span class="num">{{ romanYear }}</span>
      </div>
    </footer>
  </div>
</template>
