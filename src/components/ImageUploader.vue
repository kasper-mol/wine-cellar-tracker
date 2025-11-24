<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const props = defineProps<{
  modelValue?: File | null
  label?: string
}>()

const emit = defineEmits(['update:modelValue'])

const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)

watch(
  () => props.modelValue,
  (file) => {
    if (file) {
      previewUrl.value = URL.createObjectURL(file)
    } else {
      previewUrl.value = null
    }
  },
  { immediate: true },
)

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] || null
  emit('update:modelValue', file)
}
</script>

<template>
  <div class="space-y-2">
    <Label>{{ label || 'Image' }}</Label>

    <div class="flex items-center gap-4">
      <div v-if="previewUrl" class="w-24 h-24 rounded-md border overflow-hidden bg-muted">
        <img :src="previewUrl" alt="Preview" class="object-cover w-full h-full" />
      </div>
      <div v-else class="w-24 h-24 rounded-md border bg-muted"></div>

      <div class="flex flex-col gap-2">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleFileChange"
        />
        <Button type="button" @click="fileInput?.click()">Choose Image</Button>

        <Button
          type="button"
          variant="ghost"
          class="text-red-500"
          v-if="props.modelValue"
          @click="emit('update:modelValue', null)"
        >
          Remove
        </Button>
      </div>
    </div>
  </div>
</template>
