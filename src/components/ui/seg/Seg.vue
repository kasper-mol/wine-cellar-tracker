<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { cn } from '@/lib/utils'
import { SEG_CONTEXT } from './context'

defineOptions({
  name: 'UiSeg',
})

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    name?: string
  }>(),
  { modelValue: null },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const fallbackName = useId()
const groupName = computed(() => props.name ?? fallbackName)

provide(SEG_CONTEXT, {
  name: groupName,
  selected: computed(() => props.modelValue),
  select: (value: string) => emit('update:modelValue', value),
})
</script>

<template>
  <div
    v-bind="$attrs"
    role="radiogroup"
    :class="
      cn('inline-flex overflow-hidden rounded-md border border-border', $attrs.class as string)
    "
  >
    <slot />
  </div>
</template>
