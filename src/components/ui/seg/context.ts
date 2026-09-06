import type { ComputedRef, InjectionKey } from 'vue'

export interface SegContext {
  name: ComputedRef<string>
  selected: ComputedRef<string | null>
  select: (value: string) => void
}

export const SEG_CONTEXT: InjectionKey<SegContext> = Symbol('seg')
