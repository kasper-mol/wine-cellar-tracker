<script setup lang="ts">
import type { WineMapOverlayKind } from '@/types/wineMaps'

defineProps<{
  toggles: { kind: WineMapOverlayKind; label: string; active: boolean }[]
  /** Over the full-screen phone map: bigger targets on a solid backdrop. */
  floating?: boolean
}>()

defineEmits<{ toggle: [kind: WineMapOverlayKind] }>()
</script>

<template>
  <div role="group" aria-label="Map layers" class="flex flex-wrap gap-2">
    <button
      v-for="toggle in toggles"
      :key="toggle.kind"
      type="button"
      :aria-pressed="toggle.active"
      class="rounded-full border border-border text-foreground transition hover:border-primary/60 hover:text-primary"
      :class="[
        floating
          ? 'min-h-11 bg-background/90 px-4 text-sm shadow-sm'
          : 'bg-background px-3 py-1 text-sm',
        { 'border-primary/60 text-primary': toggle.active },
      ]"
      @click="$emit('toggle', toggle.kind)"
    >
      {{ toggle.label }}
    </button>
  </div>
</template>
