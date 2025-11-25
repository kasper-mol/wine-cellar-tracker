<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select'

import { useGrapeAppellationsStore } from '@/stores/grapeAppellations'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  appellationId: string
}>()

const wineGrapeVarietiesStore = useWineGrapeVarietiesStore()
const grapeAppellationsStore = useGrapeAppellationsStore()
const { grapeVarieties } = storeToRefs(wineGrapeVarietiesStore)

const loading = ref(false)
const feedback = ref<string | null>(null)

const rules = computed(() =>
  props.appellationId ? grapeAppellationsStore.rulesForAppellation(props.appellationId) : [],
)

watch(
  () => props.appellationId,
  (id) => {
    if (id) {
      void grapeAppellationsStore.fetchForAppellation(id)
    }
  },
  { immediate: true },
)

const form = ref({
  grapeId: '',
  rule: 'allowed' as 'allowed' | 'required' | 'forbidden',
  minPct: null as number | null,
  maxPct: null as number | null,
})

function validate() {
  const { rule, minPct, maxPct } = form.value

  if (rule === 'required' && (minPct === null || minPct === undefined)) {
    return 'Required grapes must include a min percentage.'
  }
  if (rule === 'forbidden' && (minPct !== null || maxPct !== null)) {
    return 'Forbidden grapes cannot define min/max percentages.'
  }
  if (minPct !== null && maxPct !== null && minPct > maxPct) {
    return 'Min % cannot be greater than max %.'
  }
  return null
}

async function addRule() {
  feedback.value = null
  const error = validate()
  if (error) {
    feedback.value = error
    return
  }

  try {
    loading.value = true
    await grapeAppellationsStore.create({
      appellation_id: props.appellationId,
      grape_id: form.value.grapeId,
      rule: form.value.rule,
      min_pct: form.value.minPct,
      max_pct: form.value.maxPct,
    })

    // Reset form
    form.value = {
      grapeId: '',
      rule: 'allowed',
      minPct: null,
      maxPct: null,
    }
  } catch (err: any) {
    feedback.value = err?.message ?? 'Failed to add rule.'
  } finally {
    loading.value = false
  }
}

async function updateRule(ruleEntry: any, key: 'rule' | 'min_pct' | 'max_pct', value: any) {
  try {
    await grapeAppellationsStore.update(ruleEntry.id, {
      [key]: value,
    })
  } catch (err: any) {
    feedback.value = err?.message ?? 'Update failed'
  }
}

async function removeRule(id: string) {
  await grapeAppellationsStore.delete(id)
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="font-medium mb-2">Grape Rules</h3>

      <div v-if="rules.length === 0" class="text-sm text-muted-foreground">
        No grapes added yet.
      </div>

      <div v-for="r in rules" :key="r.id" class="flex items-center gap-3 p-2 border rounded mb-1">
        <div class="w-32 font-medium">{{ r.grape?.name }}</div>
        <Select :value="r.rule" @update:value="updateRule(r, 'rule', $event)">
          <SelectTrigger class="w-32" />
          <SelectContent>
            <SelectItem value="allowed">Allowed</SelectItem>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="forbidden">Forbidden</SelectItem>
          </SelectContent>
        </Select>
        <Input
          v-model.number="r.min_pct"
          type="number"
          class="w-20"
          :disabled="r.rule === 'forbidden'"
          @change="updateRule(r, 'min_pct', r.min_pct)"
          placeholder="Min %"
        />
        <Input
          v-model.number="r.max_pct"
          type="number"
          class="w-20"
          :disabled="r.rule === 'forbidden'"
          @change="updateRule(r, 'max_pct', r.max_pct)"
          placeholder="Max %"
        />
        <Button variant="destructive" @click="removeRule(r.id)">Delete</Button>
      </div>
    </div>

    <div class="pt-4 border-t">
      <h3 class="font-medium mb-2">Add Grape</h3>
      <div class="flex flex-wrap gap-3 items-end">
        <div class="flex-1 min-w-40">
          <Label>Grape</Label>
          <select v-model="form.grapeId" class="w-full border rounded p-2">
            <option value="" disabled>Select grape</option>
            <option v-for="g in grapeVarieties" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
        </div>
        <div>
          <Label>Rule</Label>
          <Select v-model="form.rule">
            <SelectTrigger class="w-32" />
            <SelectContent>
              <SelectItem value="allowed">Allowed</SelectItem>
              <SelectItem value="required">Required</SelectItem>
              <SelectItem value="forbidden">Forbidden</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Min %</Label>
          <Input
            type="number"
            v-model.number="form.minPct"
            class="w-24"
            :disabled="form.rule === 'forbidden'"
          />
        </div>
        <div>
          <Label>Max %</Label>
          <Input
            type="number"
            v-model.number="form.maxPct"
            class="w-24"
            :disabled="form.rule === 'forbidden'"
          />
        </div>

        <Button :disabled="loading" @click="addRule">
          {{ loading ? 'Adding…' : 'Add' }}
        </Button>
      </div>

      <p v-if="feedback" class="text-red-500 text-sm mt-2">{{ feedback }}</p>
    </div>
  </div>
</template>
