<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ConfirmOptions {
  title: string
  body: string
  confirmLabel?: string
}

const open = ref(false)
const title = ref('')
const body = ref('')
const confirmLabel = ref('Remove')
let resolver: ((value: boolean) => void) | null = null

function settle(value: boolean) {
  const resolve = resolver
  resolver = null
  open.value = false
  resolve?.(value)
}

watch(open, (value) => {
  // Dismissed with Escape or the backdrop.
  if (!value && resolver) settle(false)
})

function confirm(options: ConfirmOptions) {
  title.value = options.title
  body.value = options.body
  confirmLabel.value = options.confirmLabel ?? 'Remove'
  open.value = true
  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

defineExpose({ confirm })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle class="font-heading text-[20px] font-semibold">{{ title }}</DialogTitle>
        <DialogDescription class="text-sm text-foreground/[0.7]">{{ body }}</DialogDescription>
      </DialogHeader>
      <DialogFooter class="flex justify-end gap-2">
        <Button variant="secondary" type="button" @click="settle(false)">Cancel</Button>
        <Button variant="destructive" type="button" @click="settle(true)">
          {{ confirmLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
