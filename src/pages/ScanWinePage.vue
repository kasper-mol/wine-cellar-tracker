<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Camera } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import EditorialHeader from '@/components/editorial/EditorialHeader.vue'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import { useFeedback } from '@/composables/useFeedback'
import { scanLabel } from '@/services/labelScan'
import { useScanDraftStore } from '@/stores/scanDraft'
import type { ScanResult } from '@/types/labelScan'

defineOptions({
  name: 'ScanWinePage',
})

const router = useRouter()
const scanDraftStore = useScanDraftStore()
const { feedback, setError, clearFeedback } = useFeedback()

const fileInput = ref<HTMLInputElement | null>(null)
const photo = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isScanning = ref(false)
const result = ref<ScanResult | null>(null)

/** Bumped on every new photo so a scan that's still running when the photo
 *  changes underneath it can't land its (now stale) result. */
let scanToken = 0

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  scanToken += 1
  photo.value = file
  result.value = null
  isScanning.value = false
  clearFeedback()
  previewUrl.value = file ? URL.createObjectURL(file) : null
  if (file) runScan()
}

async function runScan() {
  const image = photo.value
  if (!image) return
  const token = scanToken
  isScanning.value = true
  clearFeedback()
  try {
    const scanned = await scanLabel(image)
    if (token !== scanToken) return
    result.value = scanned
  } catch (error) {
    if (token !== scanToken) return
    setError(error, 'Could not read that label — try a clearer photo.')
  } finally {
    if (token === scanToken) isScanning.value = false
  }
}

function reset() {
  scanToken += 1
  photo.value = null
  previewUrl.value = null
  result.value = null
  isScanning.value = false
  clearFeedback()
  if (fileInput.value) fileInput.value.value = ''
}

function useThisInfo() {
  if (!result.value) return
  scanDraftStore.setDraft(result.value)
  router.push({ name: 'wine-create' })
}
</script>

<template>
  <div>
    <EditorialHeader kicker="Cellar intake" title="Scan a label" :title-size="48" />

    <FeedbackBanner :feedback="feedback" class="my-6" />

    <section class="mt-8 max-w-xl space-y-6">
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="hidden"
        @change="handleFileChange"
      />

      <div
        v-if="previewUrl"
        class="h-32 w-32 overflow-hidden rounded-md border border-border bg-foreground/[0.04]"
      >
        <img :src="previewUrl" alt="Label photo" class="h-full w-full object-cover" />
      </div>

      <div class="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" @click="fileInput?.click()">
          <Camera class="h-3.5 w-3.5" :stroke-width="1.5" />
          {{ photo ? 'Retake photo' : 'Take or choose photo' }}
        </Button>
        <Button type="button" :disabled="!photo || isScanning" @click="runScan">
          {{ isScanning ? 'Reading label…' : 'Rescan' }}
        </Button>
        <Button v-if="result" type="button" variant="ghost" @click="reset">Scan another</Button>
      </div>

      <div v-if="result" class="space-y-4 border-t border-border pt-6">
        <p class="num text-[11px] uppercase tracking-[0.18em] text-accent-700">We found this</p>

        <dl class="space-y-3">
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Producer</dt>
            <dd class="text-right font-heading text-[15px]">
              {{ result.producer ?? '— not found —' }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Name</dt>
            <dd class="text-right font-heading text-[15px]">{{ result.name ?? '— not found —' }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Vintage</dt>
            <dd class="text-right font-heading text-[15px]">
              {{ result.vintage ?? '— not found —' }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Appellation</dt>
            <dd class="text-right font-heading text-[15px]">
              {{ result.appellationText ?? '— not found —' }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Grape(s)</dt>
            <dd class="text-right font-heading text-[15px]">
              {{ result.grapesText.length ? result.grapesText.join(', ') : '— not found —' }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Style</dt>
            <dd class="text-right font-heading text-[15px] capitalize">
              {{ result.styleGuess ?? '— not found —' }}
            </dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border pb-2">
            <dt class="text-[13px] text-foreground/60">Producer link</dt>
            <dd class="max-w-[70%] text-right text-[13px]">
              <a
                v-if="result.producerLink"
                :href="result.producerLink"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline"
              >
                {{ result.producerLink }}
              </a>
              <span v-else>— not found —</span>
            </dd>
          </div>
        </dl>

        <Button type="button" @click="useThisInfo">Use this info</Button>
      </div>
    </section>
  </div>
</template>
