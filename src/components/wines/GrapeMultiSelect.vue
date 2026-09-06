<script setup lang="ts">
/* Multi-select over the grape_varieties reference list.
 * There is no combobox primitive in src/components/ui, so this is a plain
 * trigger + search popup built from Input/Badge, closed by click-outside. */
import { computed, nextTick, ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Check, ChevronDown, X } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import type { GrapeVarietyRecord } from '@/types/grapeVarieties'

defineOptions({
  name: 'GrapeMultiSelect',
})

const props = defineProps<{
  options: GrapeVarietyRecord[]
  placeholder?: string
}>()

const model = defineModel<string[]>({ default: () => [] })

const open = ref(false)
const search = ref('')
const root = ref<HTMLElement | null>(null)

onClickOutside(root, () => close())

const selected = computed(() =>
  model.value
    .map((id) => props.options.find((grape) => grape.id === id))
    .filter((grape): grape is GrapeVarietyRecord => grape !== undefined),
)

const filtered = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return props.options
  return props.options.filter((grape) => grape.name.toLowerCase().includes(term))
})

function isSelected(id: string) {
  return model.value.includes(id)
}

function toggle(id: string) {
  model.value = isSelected(id) ? model.value.filter((v) => v !== id) : [...model.value, id]
}

function remove(id: string) {
  model.value = model.value.filter((v) => v !== id)
}

function close() {
  open.value = false
  search.value = ''
}

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  ;(root.value?.querySelector('[data-grape-search]') as HTMLInputElement | undefined)?.focus()
})
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 text-start text-sm transition-colors hover:border-foreground/45 focus-visible:border-primary focus-visible:outline-offset-0"
      :aria-expanded="open"
      @click="open ? close() : (open = true)"
    >
      <template v-if="selected.length">
        <Badge v-for="grape in selected" :key="grape.id" variant="secondary">
          {{ grape.name }}
          <span
            role="button"
            tabindex="-1"
            :aria-label="`Remove ${grape.name}`"
            class="-mr-0.5 ml-0.5 cursor-pointer opacity-55 transition-opacity hover:opacity-100"
            @click.stop="remove(grape.id)"
          >
            <X class="h-3 w-3" :stroke-width="1.75" />
          </span>
        </Badge>
      </template>
      <span v-else class="text-foreground/45">
        {{ placeholder ?? '— none —' }}
      </span>
      <ChevronDown class="ml-auto h-4 w-4 shrink-0 opacity-50" :stroke-width="1.5" />
    </button>

    <div
      v-if="open"
      class="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
    >
      <div class="border-b border-border p-1.5">
        <Input
          v-model="search"
          data-grape-search
          class="min-h-8 border-0 px-1.5 focus-visible:border-0"
          placeholder="Search grapes…"
          @keydown.esc.prevent="close()"
        />
      </div>
      <ul class="max-h-60 overflow-y-auto p-1">
        <li v-if="!filtered.length" class="px-2 py-1.5 text-sm text-foreground/45">
          No grape matches “{{ search }}”.
        </li>
        <li v-for="grape in filtered" :key="grape.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            @click="toggle(grape.id)"
          >
            <Check
              class="h-3.5 w-3.5 shrink-0"
              :class="isSelected(grape.id) ? 'opacity-100' : 'opacity-0'"
              :stroke-width="1.75"
            />
            <span class="truncate">{{ grape.name }}</span>
            <span v-if="grape.color" class="ml-auto text-[11px] text-foreground/45">
              {{ grape.color }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
