import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  fetchFlavorDescriptors,
  type FlavorDescriptorRecord,
  type FlavorLevel,
  type CreateFlavorDescriptorPayload,
  type UpdateFlavorDescriptorPayload,
  createFlavorDescriptor,
  updateFlavorDescriptor,
  deleteFlavorDescriptor,
} from '@/services/flavorDescriptors'

export const useFlavorDescriptorsStore = defineStore('flavorDescriptors', () => {
  const descriptors = ref<FlavorDescriptorRecord[]>([])
  const loading = ref(false)

  async function loadAll(params?: { level?: FlavorLevel; category?: string }) {
    loading.value = true
    try {
      const data = await fetchFlavorDescriptors(params)
      descriptors.value = data
      return data
    } finally {
      loading.value = false
    }
  }

  async function add(payload: CreateFlavorDescriptorPayload) {
    const created = await createFlavorDescriptor({
      name: payload.name.trim(),
      level: payload.level,
      category: payload.category?.trim() || null,
    })
    descriptors.value = [...descriptors.value, created]
    return created
  }

  async function update(id: string, payload: UpdateFlavorDescriptorPayload) {
    const updated = await updateFlavorDescriptor(id, {
      ...payload,
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.category !== undefined
        ? { category: payload.category?.trim() || null }
        : {}),
    })
    descriptors.value = descriptors.value.map((descriptor) =>
      descriptor.id === updated.id ? updated : descriptor,
    )
    return updated
  }

  async function remove(id: string) {
    await deleteFlavorDescriptor(id)
    descriptors.value = descriptors.value.filter((descriptor) => descriptor.id !== id)
  }

  return {
    descriptors,
    loading,
    loadAll,
    add,
    update,
    remove,
  }
})
