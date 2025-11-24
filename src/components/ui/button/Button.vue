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
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        {
          default: 'bg-primary text-primary-foreground hover:bg-primary/90',
          secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
          outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          ghost: 'hover:bg-accent hover:text-accent-foreground',
          destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        }[variant],
        {
          default: 'h-10 px-4 py-2',
          sm: 'h-9 rounded-md px-3',
          lg: 'h-11 rounded-md px-8',
          icon: 'h-10 w-10',
        }[size],
        $attrs.class as string,
      )
    "
  >
    <slot />
  </button>
</template>
