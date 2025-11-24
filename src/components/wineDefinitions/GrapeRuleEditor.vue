<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { GrapeVarietyRecord } from '@/services/grapeVarieties'
import type { WineDefinitionGrapeRecord } from '@/services/wineDefinitionsGrapes'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

type WineGrapeRule = Omit<
  WineDefinitionGrapeRecord,
  'id' | 'wine_definition_id' | 'created_at' | 'updated_at'
> & {
  id?: string
  min_pct: number
  max_pct: number
}

interface Props {
  grapes: WineGrapeRule[]
  availableGrapes: GrapeVarietyRecord[]
  definitionId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:grapes', value: WineGrapeRule[]): void
}>()

const localRules = reactive<WineGrapeRule[]>([...props.grapes])

watch(
  () => props.grapes,
  (val) => {
    localRules.splice(0, localRules.length, ...val)
  },
  { deep: true },
)

watch(
  localRules,
  (val) => {
    emit('update:grapes', val)
  },
  { deep: true },
)

function addRule() {
  localRules.push({
    grape_id: '',
    min_pct: 0,
    max_pct: 100,
    required: false,
  })
}

function removeRule(index: number) {
  localRules.splice(index, 1)
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="(rule, index) in localRules"
      :key="`rule-${index}-${rule.grape_id || 'new'}`"
      class="grid grid-cols-6 gap-2 items-end"
    >
      <div class="col-span-2">
        <Label>Grape</Label>
        <Select
          :modelValue="rule.grape_id || ''"
          @update:modelValue="
            (val) => {
              if (val !== null && val !== undefined) {
                rule.grape_id = String(val)
              }
            }
          "
        >
          <SelectTrigger>
            <SelectValue placeholder="Select grape" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="g in props.availableGrapes" :key="g.id" :value="g.id">
              {{ g.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Min %</Label>
        <Input type="number" v-model.number="rule.min_pct" min="0" max="100" />
      </div>

      <div>
        <Label>Max %</Label>
        <Input type="number" v-model.number="rule.max_pct" min="0" max="100" />
      </div>

      <div class="flex flex-col items-center justify-end">
        <Label>Required</Label>
        <Checkbox v-model="rule.required" />
      </div>

      <div class="flex flex-col items-end justify-end">
        <Button size="sm" variant="destructive" @click="removeRule(index)">Remove</Button>
      </div>
    </div>

    <Button size="sm" @click="addRule">Add Grape Rule</Button>
  </div>
</template>
