<script setup lang="ts">
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { COPY_STATUSES, WINE_STYLE_TOKENS } from '@/lib/appellationCopyForm'
import { wineStyleLabel } from '@/lib/wineStyles'
import type { AppellationCopyForm } from '@/lib/appellationCopyForm'
import type { WineStyle } from '@/types/wineAppellations'

const form = defineModel<AppellationCopyForm>({ required: true })

defineProps<{ disabled?: boolean }>()

function toggleStyle(style: WineStyle, checked: boolean) {
  const styles = form.value.wine_styles
  form.value.wine_styles = checked
    ? styles.includes(style)
      ? styles
      : [...styles, style]
    : styles.filter((token) => token !== style)
}
</script>

<template>
  <Collapsible class="rounded-md border">
    <CollapsibleTrigger
      class="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
    >
      Editorial copy
      <span class="text-xs font-normal text-muted-foreground">{{ form.copy_status }}</span>
    </CollapsibleTrigger>

    <CollapsibleContent class="space-y-4 border-t px-3 py-4">
      <div class="space-y-2">
        <Label>Short description</Label>
        <Textarea
          v-model="form.short_description"
          :disabled="disabled"
          class="min-h-[60px]"
          placeholder="15–25 words. Shown on list rows and cards."
        />
      </div>

      <div class="space-y-2">
        <Label>Description</Label>
        <Textarea
          v-model="form.description"
          :disabled="disabled"
          class="min-h-[140px]"
          placeholder="70–100 words. Lead paragraph on the detail page."
        />
      </div>

      <div class="grid grid-cols-3 gap-3 max-md:grid-cols-1">
        <div class="space-y-2">
          <Label>Pronunciation</Label>
          <Input
            v-model="form.pronunciation"
            :disabled="disabled"
            placeholder="shah-toh-NUFF doo PAHP"
          />
        </div>
        <div class="space-y-2">
          <Label>Classification</Label>
          <Input v-model="form.classification" :disabled="disabled" placeholder="Grand Cru AOC" />
        </div>
        <div class="space-y-2">
          <Label>Established year</Label>
          <Input
            v-model="form.established_year"
            :disabled="disabled"
            type="number"
            inputmode="numeric"
            placeholder="1936"
          />
        </div>
      </div>

      <div class="space-y-2">
        <Label>Signature grapes</Label>
        <Input
          v-model="form.signature_grapes"
          :disabled="disabled"
          placeholder="Comma separated, most important first — e.g. Sémillon, Sauvignon Blanc"
        />
      </div>

      <div class="space-y-2">
        <Label>Wine styles</Label>
        <div class="flex flex-wrap gap-x-4 gap-y-2">
          <label
            v-for="style in WINE_STYLE_TOKENS"
            :key="style"
            class="flex items-center gap-2 text-sm"
          >
            <Checkbox
              :model-value="form.wine_styles.includes(style)"
              :disabled="disabled"
              @update:model-value="toggleStyle(style, $event === true)"
            />
            {{ wineStyleLabel(style) }}
          </label>
        </div>
      </div>

      <div class="space-y-2">
        <Label>Style summary</Label>
        <Textarea
          v-model="form.style_summary"
          :disabled="disabled"
          placeholder="One sentence on palate and structure."
        />
      </div>

      <div class="space-y-2">
        <Label>Climate & soil</Label>
        <Textarea
          v-model="form.climate_soil"
          :disabled="disabled"
          placeholder="One sentence on terroir."
        />
      </div>

      <div class="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div class="space-y-2">
          <Label>Drinking window</Label>
          <Input
            v-model="form.drinking_window"
            :disabled="disabled"
            placeholder="8–20 years; top estates 30+"
          />
        </div>
        <div class="space-y-2">
          <Label>Copy status</Label>
          <select
            v-model="form.copy_status"
            class="w-full rounded border p-2"
            :disabled="disabled"
          >
            <option v-for="status in COPY_STATUSES" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </div>
      </div>

      <div class="space-y-2">
        <Label>Food pairings</Label>
        <Input
          v-model="form.food_pairings"
          :disabled="disabled"
          placeholder="Comma separated, three dishes — e.g. seared foie gras, Roquefort, tarte Tatin"
        />
      </div>

      <div class="space-y-2">
        <Label>Fun fact</Label>
        <Textarea v-model="form.fun_fact" :disabled="disabled" placeholder="15–30 words." />
      </div>
    </CollapsibleContent>
  </Collapsible>
</template>
