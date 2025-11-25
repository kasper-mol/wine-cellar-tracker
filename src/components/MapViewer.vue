<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  imageUrl: string | null
  title: string
  placeholder?: string
  minHeightClass?: string
}>()

const dialogOpen = ref(false)
const zoomLevel = ref(1)
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

const containerClasses = computed(() => props.minHeightClass ?? 'min-h-[320px]')

function openViewer() {
  if (!props.imageUrl) return
  dialogOpen.value = true
  zoomLevel.value = 1
}

function zoomIn() {
  zoomLevel.value = Math.min(MAX_ZOOM, parseFloat((zoomLevel.value + ZOOM_STEP).toFixed(2)))
}

function zoomOut() {
  zoomLevel.value = Math.max(MIN_ZOOM, parseFloat((zoomLevel.value - ZOOM_STEP).toFixed(2)))
}

const isZoomInDisabled = computed(() => zoomLevel.value >= MAX_ZOOM)
const isZoomOutDisabled = computed(() => zoomLevel.value <= MIN_ZOOM)
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-border">
    <div
      :class="[
        'group relative flex w-full items-center justify-center bg-muted text-center text-sm uppercase tracking-[0.3em] text-muted-foreground',
        containerClasses,
        imageUrl ? 'cursor-zoom-in' : 'cursor-not-allowed',
      ]"
      @click="openViewer"
    >
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="title + ' map'"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span v-else>{{ placeholder || 'No image available' }}</span>
      <div
        v-if="imageUrl"
        class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      ></div>
      <div
        v-if="imageUrl"
        class="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white"
      >
        Click to zoom
      </div>
    </div>
  </div>

  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <p class="text-sm text-muted-foreground">Use the controls to zoom and drag to inspect details.</p>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="zoomOut" :disabled="isZoomOutDisabled">-
            </Button>
            <span class="text-sm tabular-nums">{{ zoomLevel.toFixed(2) }}x</span>
            <Button variant="outline" size="sm" @click="zoomIn" :disabled="isZoomInDisabled">+
            </Button>
          </div>
        </div>
        <div class="max-h-[70vh] overflow-auto rounded-lg border bg-muted/40 p-2">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            :alt="title + ' enlarged map'"
            class="mx-auto max-w-full"
            :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }"
          />
          <div v-else class="p-6 text-center text-muted-foreground">No image available</div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
  
</template>
