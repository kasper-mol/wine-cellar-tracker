<script setup lang="ts">
import { computed, inject } from 'vue'
import { cn } from '@/lib/utils'
import { SEG_CONTEXT } from './context'

defineOptions({
  name: 'UiSegOption',
})

const props = defineProps<{
  value: string
  disabled?: boolean
}>()

const seg = inject(SEG_CONTEXT, null)
const checked = computed(() => seg?.selected.value === props.value)
</script>

<template>
  <label
    :class="
      cn(
        'inline-flex cursor-pointer items-center gap-1.5 border-l border-border px-3 py-[7px] text-[13px] transition-colors first:border-l-0',
        checked
          ? 'text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary))]'
          : 'hover:bg-foreground/[0.07]',
        disabled && 'pointer-events-none opacity-45',
      )
    "
  >
    <input
      type="radio"
      class="pointer-events-none absolute h-0 w-0 opacity-0"
      :name="seg?.name.value"
      :value="value"
      :checked="checked"
      :disabled="disabled"
      @change="seg?.select(value)"
    />
    <slot />
  </label>
</template>
