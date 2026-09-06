<script setup lang="ts">
import type { SelectTriggerProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { ChevronDown } from 'lucide-vue-next'
import { SelectIcon, SelectTrigger, useForwardProps } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<SelectTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectTrigger
    v-bind="forwardedProps"
    :class="
      cn(
        'flex min-h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-border bg-transparent px-2.5 py-1.5 text-start text-sm transition-colors hover:border-foreground/45 data-[placeholder]:text-foreground/45 focus-visible:border-primary focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-45 [&>span]:truncate',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="h-4 w-4 shrink-0 opacity-50" :stroke-width="1.5" />
    </SelectIcon>
  </SelectTrigger>
</template>
