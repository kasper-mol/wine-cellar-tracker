<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

import { useVintageRatingsStore } from '@/stores/vintageRatings'
import type { RatingType } from '@/services/vintageRatings'

const props = defineProps<{
  ratingId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const vintageRatingsStore = useVintageRatingsStore()
const { ratings } = storeToRefs(vintageRatingsStore)

const rating = computed(() => ratings.value.find((r) => r.id === props.ratingId))
const isSaving = ref(false)
const isDeleting = ref(false)

const form = ref({
  rating: '',
  rating_type: '' as '' | RatingType,
  maturity: '',
  structure_flags: [] as string[],
  drink_from: null as number | null,
  drink_until: null as number | null,
  description: '',
})

watch(
  rating,
  (value) => {
    if (!value) return
    form.value = {
      rating: value.rating,
      rating_type: value.rating_type ?? '',
      maturity: value.maturity ?? '',
      structure_flags: value.structure_flags ?? [],
      drink_from: value.drink_from,
      drink_until: value.drink_until,
      description: value.description ?? '',
    }
  },
  { immediate: true },
)

async function save() {
  if (!rating.value) return

  isSaving.value = true
  try {
    await vintageRatingsStore.updateRating(rating.value.id, {
      rating: form.value.rating,
      rating_type: form.value.rating_type || null,
      maturity: form.value.maturity.trim() || null,
      structure_flags: form.value.structure_flags,
      drink_from: form.value.drink_from,
      drink_until: form.value.drink_until,
      description: form.value.description.trim() || null,
    })

    emit('close')
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!rating.value || isDeleting.value) return

  isDeleting.value = true
  try {
    await vintageRatingsStore.deleteRating(rating.value.id)
    emit('close')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <Dialog open @update:open="emit('close')">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit vintage rating</DialogTitle>
      </DialogHeader>

      <div v-if="rating" class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Rating</Label>
            <Input v-model="form.rating" />
          </div>

          <div>
            <Label>Rating type</Label>
            <Select v-model="form.rating_type">
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Numeric</SelectItem>
                <SelectItem value="grade">Grade</SelectItem>
                <SelectItem value="range">Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Maturity</Label>
          <Input v-model="form.maturity" placeholder="Drink / Hold / etc." />
        </div>

        <div>
          <Label>Structure flags (comma separated)</Label>
          <Input
            :model-value="form.structure_flags.join(', ')"
            @update:model-value="
              form.structure_flags = $event
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            "
            placeholder="T, O, F"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <Label>Drink from</Label>
            <Input type="number" v-model.number="form.drink_from" />
          </div>

          <div>
            <Label>Drink until</Label>
            <Input type="number" v-model.number="form.drink_until" />
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea v-model="form.description" rows="4" />
        </div>
      </div>

      <DialogFooter>
        <div class="flex w-full items-center justify-between">
          <Button
            variant="destructive"
            :disabled="isDeleting"
            @click="remove"
          >
            {{ isDeleting ? 'Deleting…' : 'Delete' }}
          </Button>

          <div class="flex items-center gap-2">
            <Button variant="secondary" @click="emit('close')"> Cancel </Button>
            <Button :disabled="isSaving" @click="save">
              {{ isSaving ? 'Saving…' : 'Save' }}
            </Button>
          </div>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
