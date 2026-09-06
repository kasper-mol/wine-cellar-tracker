<script setup lang="ts">
/* Searchable single-select over dw_archetypes. There are ~150 of them, so a
 * plain Select is unusable — this filters on name and key as you type.
 * `null` means "inherit from the appellation/region mapping". */
import { computed, nextTick, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Check, ChevronDown } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import type { ArchetypeRecord } from '@/types/drinkingWindow'

defineOptions({
  name: 'ArchetypeSelect',
})

const props = defineProps<{
  options: ArchetypeRecord[]
  /** Label for the null option — e.g. the archetype the wine would inherit */
  autoLabel: string
}>()

const model = defineModel<string | null>({ default: null })

const open = ref(false)
const search = ref('')
const root = ref<HTMLElement | null>(null)

onClickOutside(root, () => close())

const selected = computed(() => props.options.find((a) => a.id === model.value) ?? null)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter(
    (a) => a.name.toLowerCase().includes(term) || a.key.toLowerCase().includes(term),
  )
})

function pick(id: string | null) {
  model.value = id
  close()
}

function close() {
  open.value = false
  search.value = ''
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  ;(root.value?.querySelector('[data-archetype-search]') as HTMLInputElement | undefined)?.focus()
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-start text-sm transition-colors hover:border-foreground/45 focus-visible:border-primary focus-visible:outline-offset-0"
      :aria-expanded="open"
      @click="open ? close() : (open = true)"
    >
      <span v-if="selected" class="truncate">{{ selected.name }}</span>
      <span v-else class="truncate text-foreground/45">{{ autoLabel }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 opacity-50" :stroke-width="1.5" />
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
    >
      <div class="border-b border-border p-1.5">
        <Input
          v-model="search"
          data-archetype-search
          class="min-h-8 border-0 px-1.5 focus-visible:border-0"
          placeholder="Search archetypes…"
          @keydown.esc.prevent="close()"
        />
      </div>
      <ul class="max-h-72 overflow-y-auto p-1">
        <li v-if="!search">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            @click="pick(null)"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0"
              :class="model === null ? 'opacity-100' : 'opacity-0'"
              :stroke-width="1.75"
            />
            <span class="truncate text-foreground/70">{{ autoLabel }}</span>
          </button>
        </li>
        <li v-if="!filtered.length" class="px-2 py-1.5 text-sm text-foreground/45">
          No archetype matches “{{ search }}”.
        </li>
        <li v-for="archetype in filtered" :key="archetype.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            @click="pick(archetype.id)"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0"
              :class="model === archetype.id ? 'opacity-100' : 'opacity-0'"
              :stroke-width="1.75"
            />
            <span class="truncate">{{ archetype.name }}</span>
            <span class="num ml-auto shrink-0 text-[11px] text-foreground/45">
              {{ archetype.t_start }}–{{ archetype.t_end }}y
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
