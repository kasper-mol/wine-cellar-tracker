import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  listWineDefinitions,
  getWineDefinition,
  createWineDefinition,
  updateWineDefinition,
  deleteWineDefinition,
  validateWineDefinition,
  type WineDefinitionRecord,
  type CreateWineDefinitionPayload,
  type UpdateWineDefinitionPayload,
} from '@/services/wineDefinitions'

import {
  listGrapesForDefinition,
  addGrapeToDefinition,
  updateGrapeInDefinition,
  deleteGrapeFromDefinition,
  type WineDefinitionGrapeRecord,
  type CreateWineDefinitionGrapePayload,
  type UpdateWineDefinitionGrapePayload,
} from '@/services/wineDefinitionsGrapes'

export const useWineDefinitionStore = defineStore('wineDefinitions', () => {
  const definitions = ref<WineDefinitionRecord[]>([])
  const current = ref<(WineDefinitionRecord & { grapes: WineDefinitionGrapeRecord[] }) | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref<string | null>(null)

  async function loadDefinitions() {
    loading.value = true
    const { data, error: err } = await listWineDefinitions()
    loading.value = false
    if (err) {
      error.value = err.message
    } else {
      definitions.value = data ?? []
    }
  }

  async function loadOne(id: string) {
    loading.value = true
    const { data: def, error: defError } = await getWineDefinition(id)
    if (defError || !def) {
      loading.value = false
      error.value = defError?.message || 'Not found'
      return
    }

    const { data: grapes, error: grapesError } = await listGrapesForDefinition(id)
    loading.value = false
    if (grapesError) {
      error.value = grapesError.message
      return
    }

    current.value = {
      ...def,
      grapes: grapes ?? [],
    }
  }

  async function create(payload: CreateWineDefinitionPayload) {
    saving.value = true
    const { data, error: err } = await createWineDefinition(payload)
    saving.value = false
    if (err) {
      error.value = err.message
      return null
    }
    await loadDefinitions()
    return data
  }

  async function update(id: string, payload: UpdateWineDefinitionPayload) {
    saving.value = true
    const { data, error: err } = await updateWineDefinition(id, payload)
    saving.value = false
    if (err) {
      error.value = err.message
      return null
    }
    await loadDefinitions()
    return data
  }

  async function deleteOne(id: string) {
    saving.value = true
    const { error: err } = await deleteWineDefinition(id)
    saving.value = false
    if (err) error.value = err.message
    await loadDefinitions()
  }

  async function validate(def: any) {
    const { data, error: err } = await validateWineDefinition(def)
    if (err) {
      error.value = err.message
      return null
    }
    return data
  }

  async function addGrape(payload: CreateWineDefinitionGrapePayload) {
    const { data, error: err } = await addGrapeToDefinition(payload)
    if (err) {
      error.value = err.message
      return null
    }
    if (current.value) current.value.grapes.push(data as any)
    return data
  }

  async function updateGrape(id: string, payload: UpdateWineDefinitionGrapePayload) {
    const { data, error: err } = await updateGrapeInDefinition(id, payload)
    if (err) {
      error.value = err.message
      return null
    }
    if (current.value) {
      const idx = current.value.grapes.findIndex((g) => g.id === id)
      if (idx !== -1) current.value.grapes[idx] = data as any
    }
    return data
  }

  async function deleteGrape(id: string) {
    const { error: err } = await deleteGrapeFromDefinition(id)
    if (err) {
      error.value = err.message
      return
    }
    if (current.value) {
      current.value.grapes = current.value.grapes.filter((g) => g.id !== id)
    }
  }

  return {
    definitions,
    current,
    loading,
    saving,
    error,
    loadDefinitions,
    loadOne,
    create,
    update,
    deleteOne,
    validate,
    addGrape,
    updateGrape,
    deleteGrape,
  }
})
