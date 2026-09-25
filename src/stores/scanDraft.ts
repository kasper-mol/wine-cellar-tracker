import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ScanResult } from '@/types/labelScan'

/** Transient handoff between the label-scan screen and the add-wine form.
 *  Not persisted — a page refresh drops it same as any other in-memory state. */
export const useScanDraftStore = defineStore('scanDraft', () => {
  const draft = ref<ScanResult | null>(null)

  function setDraft(result: ScanResult) {
    draft.value = result
  }

  /** Consume the draft: returns it and clears it so a later plain "Add wine"
   *  doesn't accidentally pick up a stale scan. */
  function takeDraft(): ScanResult | null {
    const value = draft.value
    draft.value = null
    return value
  }

  return { draft, setDraft, takeDraft }
})
