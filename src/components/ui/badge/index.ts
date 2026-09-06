import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm px-2.5 py-[3px] text-[11px] tracking-[0.02em] transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent-100 text-accent-800',
        secondary: 'bg-neutral-100 text-neutral-800',
        destructive: 'border border-destructive text-destructive',
        outline: 'border border-primary text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
