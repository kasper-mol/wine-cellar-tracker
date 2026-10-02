<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { isMultiStyle } from '@/lib/appellationStyleView'
import { wineStyleLabel } from '@/lib/wineStyles'
import { useAppellationStyleProfilesStore } from '@/stores/appellationStyleProfiles'
import { useWineAppellationsStore } from '@/stores/wineAppellations'
import type { AppellationCopyStatus, WineStyle } from '@/types/wineAppellations'

const props = defineProps<{ appellationId: string | null }>()

const profilesStore = useAppellationStyleProfilesStore()
const wineAppellationsStore = useWineAppellationsStore()

/** The SAVED record, not the copy form's unsaved edits: the DB only accepts a profile for a style
 *  the appellation really has, and grapes chosen from its saved list. */
const appellation = computed(() =>
  wineAppellationsStore.appellations.find((row) => row.id === props.appellationId),
)
const styles = computed<WineStyle[]>(() => appellation.value?.wine_styles ?? [])
const eligible = computed(() => !!appellation.value && isMultiStyle(appellation.value))

interface Draft {
  summary: string
  window: string
  grapes: string[]
  status: AppellationCopyStatus
}
const drafts = reactive<Partial<Record<WineStyle, Draft>>>({})
const busy = ref<Set<WineStyle>>(new Set())
const feedback = ref<Record<string, string>>({})

function draftFrom(style: WineStyle): Draft {
  const profile = props.appellationId
    ? profilesStore.profileFor(props.appellationId, style)
    : undefined
  return {
    summary: profile?.style_summary ?? '',
    window: profile?.drinking_window ?? '',
    grapes: [...(profile?.signature_grapes ?? [])],
    status: profile?.copy_status ?? 'reviewed',
  }
}

watch(
  () => props.appellationId,
  async (id) => {
    if (!id) return
    try {
      await profilesStore.fetchForAppellation(id)
    } catch {
      /* the guard text below covers an empty list; a save will surface any real error */
    }
    for (const style of styles.value) drafts[style] = draftFrom(style)
  },
  { immediate: true },
)

watch(styles, (list) => {
  for (const style of list) if (!drafts[style]) drafts[style] = draftFrom(style)
})

function toggleGrape(style: WineStyle, grape: string) {
  const draft = drafts[style]
  if (!draft) return
  draft.grapes = draft.grapes.includes(grape)
    ? draft.grapes.filter((g) => g !== grape)
    : [...draft.grapes, grape]
}

async function save(style: WineStyle) {
  const draft = drafts[style]
  if (!props.appellationId || !draft || busy.value.has(style)) return
  feedback.value[style] = ''
  busy.value.add(style)
  try {
    await profilesStore.save({
      appellation_id: props.appellationId,
      wine_style: style,
      style_summary: draft.summary.trim() || null,
      drinking_window: draft.window.trim() || null,
      signature_grapes: draft.grapes.length ? draft.grapes : null,
      // A human saved it: drafted text becomes reviewed, so a batch re-import can't overwrite it.
      copy_status: draft.status === 'generated' ? 'reviewed' : draft.status,
    })
    drafts[style] = draftFrom(style)
    feedback.value[style] = 'Saved.'
  } catch (error) {
    feedback.value[style] = error instanceof Error ? error.message : 'Failed to save.'
  } finally {
    busy.value.delete(style)
  }
}

async function clear(style: WineStyle) {
  const existing = props.appellationId
    ? profilesStore.profileFor(props.appellationId, style)
    : undefined
  if (!existing || busy.value.has(style)) return
  busy.value.add(style)
  try {
    await profilesStore.remove(existing)
    drafts[style] = draftFrom(style)
    feedback.value[style] = 'Cleared — this style shows the whole-appellation text again.'
  } catch (error) {
    feedback.value[style] = error instanceof Error ? error.message : 'Failed to clear.'
  } finally {
    busy.value.delete(style)
  }
}
</script>

<template>
  <div v-if="appellationId" class="space-y-3 rounded-lg border border-border p-4">
    <div>
      <p class="text-sm font-medium text-foreground">Per-style text</p>
      <p class="text-xs text-muted-foreground">
        A white and a red from the same appellation are different wines. Anything left blank shows
        the whole-appellation text above. Saving drafted text marks it reviewed.
      </p>
    </div>

    <p
      v-if="!eligible"
      class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
    >
      Only for appellations that make more than one wine style. Set the styles and save the
      appellation first.
    </p>

    <template v-else>
      <div
        v-for="style in styles"
        :key="style"
        class="space-y-3 rounded-md border border-border/70 p-3"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-700">
            {{ wineStyleLabel(style) }}
          </p>
          <span
            v-if="profilesStore.profileFor(appellationId, style)"
            class="text-[11px] text-muted-foreground"
          >
            {{ profilesStore.profileFor(appellationId, style)?.copy_status }}
          </span>
        </div>

        <template v-if="drafts[style]">
          <div class="space-y-1">
            <Label>Style summary</Label>
            <Textarea
              v-model="drafts[style]!.summary"
              rows="2"
              maxlength="220"
              :placeholder="appellation?.style_summary ?? ''"
            />
          </div>
          <div class="space-y-1">
            <Label>Drinking window</Label>
            <Input
              v-model="drafts[style]!.window"
              maxlength="120"
              :placeholder="appellation?.drinking_window ?? ''"
            />
          </div>
          <div v-if="appellation?.signature_grapes?.length" class="space-y-1">
            <Label>Signature grapes for this style</Label>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="grape in appellation.signature_grapes"
                :key="grape"
                type="button"
                class="rounded-full border px-2 py-0.5 text-xs transition-colors"
                :class="
                  drafts[style]!.grapes.includes(grape)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground/70 hover:border-foreground/40'
                "
                @click="toggleGrape(style, grape)"
              >
                {{ grape }}
              </button>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" :disabled="busy.has(style)" @click="save(style)">
              Save {{ wineStyleLabel(style).toLowerCase() }}
            </Button>
            <Button
              v-if="profilesStore.profileFor(appellationId, style)"
              type="button"
              size="sm"
              variant="ghost"
              :disabled="busy.has(style)"
              @click="clear(style)"
            >
              Clear
            </Button>
            <span v-if="feedback[style]" class="text-xs text-muted-foreground">
              {{ feedback[style] }}
            </span>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
