<script setup lang="ts">
import { cn } from '@/lib/utils'

defineOptions({
  name: 'UiButton',
})

withDefaults(
  defineProps<{
    variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
    size?: 'default' | 'sm' | 'lg' | 'icon'
  }>(),
  {
    variant: 'default',
    size: 'default',
  },
)
</script>

<template>
  <button
    v-bind="$attrs"
    :class="
      cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-heading text-sm font-semibold leading-tight transition-colors disabled:pointer-events-none disabled:opacity-45 disabled:cursor-not-allowed',
        {
          // No solid accent fills anywhere in this system — the primary is an outline.
          default: 'border-primary text-primary hover:bg-primary/[0.12] active:bg-primary/[0.22]',
          secondary: 'border-border hover:bg-foreground/[0.07] active:bg-foreground/[0.14]',
          outline: 'border-border hover:bg-foreground/[0.07] active:bg-foreground/[0.14]',
          ghost: 'text-primary hover:bg-primary/10 active:bg-primary/[0.18]',
          destructive: 'text-destructive hover:bg-destructive/10 active:bg-destructive/[0.18]',
        }[variant],
        {
          default: 'min-h-9 px-4 py-2',
          sm: 'min-h-8 px-3 py-1.5 text-[13px]',
          lg: 'min-h-11 px-6 py-2',
          icon: 'h-9 w-9 p-0',
        }[size],
        $attrs.class as string,
      )
    "
  >
    <slot />
  </button>
</template>
