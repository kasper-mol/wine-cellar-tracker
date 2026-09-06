<script setup lang="ts">
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiInput',
})

defineProps<{
  modelValue?: string | number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <input
    v-bind="$attrs"
    :value="modelValue ?? ''"
    :class="
      cn(
        'flex min-h-9 w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm caret-primary transition-colors placeholder:text-foreground/45 hover:border-foreground/45 focus-visible:border-primary focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-45',
        $attrs.class as string,
      )
    "
    @input="onInput"
  />
</template>
