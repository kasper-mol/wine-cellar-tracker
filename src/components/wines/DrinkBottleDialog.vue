<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useMainStore } from '@/stores/main'
import { useFeedback } from '@/composables/useFeedback'
import type { UserWine } from '@/types/wines'

const emit = defineEmits<{ saved: [message: string] }>()

const mainStore = useMainStore()
const { feedback, setError, clearFeedback } = useFeedback()

const dialogOpen = ref(false)
const isSaving = ref(false)
const wine = ref<UserWine | null>(null)

const currentStock = computed(() => wine.value?.quantity ?? 0)

/** Local (not UTC) yyyy-mm-dd for the date input default. */
function todayStr() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const form = reactive({
  consumedAt: todayStr(),
  quantity: '1',
  tastingNotes: '',
})
// reka-ui Slider works with an array value
const rating = ref<number[]>([90])

function open(w: UserWine) {
  clearFeedback()
  wine.value = w
  form.consumedAt = todayStr()
  form.quantity = '1'
  form.tastingNotes = ''
  rating.value = [90]
  dialogOpen.value = true
}

async function handleSubmit() {
  if (!wine.value) return

  const quantity = Number(form.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) {
    setError(null, 'Enter a whole number of bottles (at least 1).')
    return
  }
  if (quantity > currentStock.value) {
    setError(null, `You only have ${currentStock.value} bottle(s) in stock.`)
    return
  }
  if (!form.consumedAt) {
    setError(null, 'Pick a date.')
    return
  }

  isSaving.value = true
  clearFeedback()
  try {
    await mainStore.drinkBottle({
      wineId: wine.value.id,
      quantity,
      consumedAt: form.consumedAt,
      tastingNotes: form.tastingNotes.trim() || null,
      personalRating: rating.value[0] ?? null,
    })
    const label = `${wine.value.name}${wine.value.vintage ? ` ${wine.value.vintage}` : ''}`
    emit(
      'saved',
      `Logged ${quantity} bottle${quantity === 1 ? '' : 's'} of “${label}”.`,
    )
    dialogOpen.value = false
  } catch (error) {
    setError(error, 'Failed to log the bottle.')
  } finally {
    isSaving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Drink a bottle</DialogTitle>
        <DialogDescription>
          {{ wine ? `${wine.name}${wine.vintage ? ` · ${wine.vintage}` : ''}` : '' }} —
          {{ currentStock }} in stock
        </DialogDescription>
      </DialogHeader>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="drink-date">Date</Label>
            <Input id="drink-date" v-model="form.consumedAt" type="date" />
          </div>
          <div class="space-y-2">
            <Label for="drink-qty">Bottles</Label>
            <Input
              id="drink-qty"
              v-model="form.quantity"
              type="number"
              min="1"
              :max="currentStock"
            />
          </div>
        </div>

        <div class="space-y-2">
          <Label for="drink-notes">Tasting notes</Label>
          <Textarea
            id="drink-notes"
            v-model="form.tastingNotes"
            placeholder="How was it?"
            rows="3"
          />
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label>Personal rating</Label>
            <span class="text-sm font-medium tabular-nums">{{ rating[0] }} / 100</span>
          </div>
          <Slider v-model="rating" :min="1" :max="100" :step="1" />
        </div>

        <FeedbackBanner :feedback="feedback" />

        <DialogFooter class="flex justify-end gap-2">
          <Button variant="outline" type="button" @click="dialogOpen = false">Cancel</Button>
          <Button type="submit" :disabled="isSaving || currentStock === 0">
            {{ isSaving ? 'Logging…' : 'Log bottle' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
