<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  useForwardPropsEmits,
} from "reka-ui"
import { cn } from "@/lib/utils"

defineOptions({
  name: "UiSlider",
})

const props = defineProps<SliderRootProps & { class?: HTMLAttributes["class"] }>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, "class")
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    :class="
      cn(
        'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50',
        props.class,
      )
    "
    v-bind="forwarded"
  >
    <SliderTrack class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderRange class="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      v-for="(_, key) in props.modelValue"
      :key="key"
      class="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
