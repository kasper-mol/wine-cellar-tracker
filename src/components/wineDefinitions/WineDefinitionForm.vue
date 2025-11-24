<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import type {
  WineDefinitionRecord,
  CreateWineDefinitionPayload,
  UpdateWineDefinitionPayload,
} from '@/services/wineDefinitions'
import type { WineDefinitionGrapeRecord } from '@/services/wineDefinitionsGrapes'

// Type for grape rules in the form/editor (can be new or existing)
// Makes DB-only fields optional for new records
type WineGrapeRule = Omit<
  WineDefinitionGrapeRecord,
  'id' | 'wine_definition_id' | 'created_at' | 'updated_at'
> & {
  id?: string // Optional for new records
  min_pct: number // Not null in form (DB allows null, but form uses numbers)
  max_pct: number // Not null in form (DB allows null, but form uses numbers)
}
import { useWineDefinitionStore } from '@/stores/wineDefinitions'
import { useWineGrapeVarietiesStore } from '@/stores/wineGrapeVarieties'

import OwnerSelector from './OwnerSelector.vue'
import GrapeRuleEditor from './GrapeRuleEditor.vue'

import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'

const props = defineProps<{
  definition?: WineDefinitionRecord | null
}>()

const emit = defineEmits<{
  (e: 'saved', value: WineDefinitionRecord): void
}>()

const router = useRouter()

// Stores
const store = useWineDefinitionStore()
const grapeStore = useWineGrapeVarietiesStore()

// Load grape varieties on mount
onMounted(async () => {
  await grapeStore.loadAll()
})

// Helper to transform WineDefinitionGrapeRecord to WineGrapeRule
// Converts nullable min/max to numbers and omits DB-only fields
function transformGrapes(grapes: WineDefinitionGrapeRecord[] | undefined): WineGrapeRule[] {
  if (!grapes) return []
  return grapes.map((g) => ({
    id: g.id,
    grape_id: g.grape_id,
    min_pct: g.min_pct ?? 0,
    max_pct: g.max_pct ?? 100,
    required: g.required,
  }))
}

// Reactive form
const form = reactive({
  name: props.definition?.name ?? '',
  description: props.definition?.description ?? '',
  version: props.definition?.version ?? 1,
  owner: {
    country_id: props.definition?.country_id ?? null,
    region_id: props.definition?.region_id ?? null,
    appellation_id: props.definition?.appellation_id ?? null,
  },
  grapes: transformGrapes(
    (props.definition as WineDefinitionRecord & { grapes?: WineDefinitionGrapeRecord[] })?.grapes,
  ),
  rule_json: props.definition?.rule_json ?? {},
})

// Watch for prop changes
watch(
  () => props.definition,
  (val) => {
    if (val) {
      form.name = val.name
      form.description = val.description ?? ''
      form.version = val.version
      form.owner = {
        country_id: val.country_id,
        region_id: val.region_id,
        appellation_id: val.appellation_id,
      }
      form.grapes = transformGrapes(
        (val as WineDefinitionRecord & { grapes?: WineDefinitionGrapeRecord[] })?.grapes,
      )
      form.rule_json = val.rule_json ?? {}
    }
  },
  { deep: true },
)

// Save handler
async function save() {
  let data: WineDefinitionRecord | null = null
  if (props.definition?.id) {
    const payload: UpdateWineDefinitionPayload = {
      name: form.name,
      description: form.description,
      version: form.version,
      country_id: form.owner.country_id,
      region_id: form.owner.region_id,
      appellation_id: form.owner.appellation_id,
      rule_json: form.rule_json,
    }
    data = await store.update(props.definition.id, payload)
  } else {
    const payload: CreateWineDefinitionPayload = {
      name: form.name,
      description: form.description,
      version: form.version,
      country_id: form.owner.country_id,
      region_id: form.owner.region_id,
      appellation_id: form.owner.appellation_id,
      rule_json: form.rule_json,
    }
    data = await store.create(payload)
  }

  if (!data) return

  // Save grape rules
  for (const grape of form.grapes) {
    if (!grape.id) {
      // New grape - add it
      await store.addGrape({
        wine_definition_id: data.id,
        grape_id: grape.grape_id,
        min_pct: grape.min_pct,
        max_pct: grape.max_pct,
        required: grape.required,
      })
    } else {
      // Existing grape - update it if changed
      await store.updateGrape(grape.id, {
        grape_id: grape.grape_id,
        min_pct: grape.min_pct,
        max_pct: grape.max_pct,
        required: grape.required,
      })
    }
  }

  emit('saved', data)
  router.push({ name: 'WineDefinitionsList' })
}

// Validation helper
async function validate() {
  const toValidate = {
    name: form.name,
    description: form.description,
    version: form.version,
    country_id: form.owner.country_id,
    region_id: form.owner.region_id,
    appellation_id: form.owner.appellation_id,
    grapes: form.grapes.map((g) => ({
      grape_id: g.grape_id,
      min_pct: g.min_pct,
      max_pct: g.max_pct,
      required: g.required,
    })),
    rule_json: form.rule_json,
  }

  const res = await store.validate(toValidate)
  if (res?.errors?.length) {
    alert('Validation errors:\n' + res.errors.join('\n'))
  } else {
    alert('Validation passed')
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Wine Definition</CardTitle>
      <CardDescription>Define allowed grapes and rules for this wine.</CardDescription>
    </CardHeader>

    <CardContent class="space-y-4">
      <div class="grid gap-4">
        <div class="flex flex-col gap-1">
          <Label>Name</Label>
          <Input v-model="form.name" placeholder="Wine name" />
        </div>

        <div class="flex flex-col gap-1">
          <Label>Description</Label>
          <Textarea v-model="form.description" placeholder="Optional description" />
        </div>

        <div class="flex flex-col gap-1">
          <Label>Version</Label>
          <Input type="number" v-model.number="form.version" min="1" />
        </div>

        <div>
          <Label>Owner</Label>
          <OwnerSelector v-model="form.owner" />
        </div>

        <div>
          <Label>Grape Rules</Label>
          <GrapeRuleEditor
            :definitionId="props.definition?.id ?? ''"
            :grapes="form.grapes"
            :availableGrapes="grapeStore.grapeVarieties"
            @update:grapes="(val) => (form.grapes = val)"
          />
        </div>

        <div>
          <Collapsible>
            <CollapsibleTrigger>
              <Button size="sm">Show Advanced JSON Rules</Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Textarea v-model="form.rule_json" rows="6" />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </CardContent>

    <CardFooter class="flex gap-2">
      <Button variant="outline" @click="validate">Validate</Button>
      <Button @click="save">Save</Button>
    </CardFooter>
  </Card>
</template>
