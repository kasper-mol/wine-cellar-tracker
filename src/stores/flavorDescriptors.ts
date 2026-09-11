import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createFlavorCluster,
  createFlavorDescriptor,
  deleteFlavorCluster,
  deleteFlavorDescriptor,
  fetchFlavorClusters,
  fetchFlavorDescriptors,
  updateFlavorCluster,
  updateFlavorDescriptor,
} from '@/services/flavorDescriptors'
import {
  FLAVOR_LEVELS,
  type FlavorClusterCreatePayload,
  type FlavorClusterRecord,
  type FlavorClusterUpdatePayload,
  type FlavorClusterWithDescriptors,
  type FlavorDescriptorCreatePayload,
  type FlavorDescriptorRecord,
  type FlavorDescriptorUpdatePayload,
  type FlavorLevel,
} from '@/types/flavorDescriptors'

function byOrder<T extends { sort_order: number; name: string }>(a: T, b: T) {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name)
}

function byLevelThenOrder(a: FlavorClusterRecord, b: FlavorClusterRecord) {
  return FLAVOR_LEVELS.indexOf(a.level) - FLAVOR_LEVELS.indexOf(b.level) || byOrder(a, b)
}

export const useFlavorDescriptorsStore = defineStore('flavorDescriptors', () => {
  const clusters = ref<FlavorClusterRecord[]>([])
  const descriptors = ref<FlavorDescriptorRecord[]>([])
  const loading = ref(false)

  /** Clusters with descriptors attached, in WSET order. */
  const clustersWithDescriptors = computed<FlavorClusterWithDescriptors[]>(() => {
    const byCluster = new Map<string, FlavorDescriptorRecord[]>()
    for (const descriptor of descriptors.value) {
      const list = byCluster.get(descriptor.cluster_id) ?? []
      list.push(descriptor)
      byCluster.set(descriptor.cluster_id, list)
    }
    return [...clusters.value].sort(byLevelThenOrder).map((cluster) => ({
      ...cluster,
      descriptors: (byCluster.get(cluster.id) ?? []).sort(byOrder),
    }))
  })

  /** Primary → secondary → tertiary, each with its clusters. Empty levels are kept. */
  const lexicon = computed(() =>
    FLAVOR_LEVELS.map((level) => ({
      level,
      clusters: clustersWithDescriptors.value.filter((cluster) => cluster.level === level),
    })),
  )

  async function loadAll() {
    loading.value = true
    try {
      const [clusterRows, descriptorRows] = await Promise.all([
        fetchFlavorClusters(),
        fetchFlavorDescriptors(),
      ])
      clusters.value = clusterRows
      descriptors.value = descriptorRows
    } finally {
      loading.value = false
    }
  }

  // Clusters -----------------------------------------------------------------

  async function addCluster(payload: FlavorClusterCreatePayload) {
    const created = await createFlavorCluster({
      ...payload,
      name: payload.name.trim(),
      colour: payload.colour ?? null,
      description: payload.description?.trim() || null,
      sort_order: payload.sort_order ?? nextClusterOrder(payload.level),
    })
    clusters.value = [...clusters.value, created]
    return created
  }

  async function updateCluster(id: string, payload: FlavorClusterUpdatePayload) {
    const updated = await updateFlavorCluster(id, {
      ...payload,
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.description !== undefined
        ? { description: payload.description?.trim() || null }
        : {}),
    })
    clusters.value = clusters.value.map((cluster) =>
      cluster.id === updated.id ? updated : cluster,
    )
    return updated
  }

  async function removeCluster(id: string) {
    await deleteFlavorCluster(id)
    clusters.value = clusters.value.filter((cluster) => cluster.id !== id)
    descriptors.value = descriptors.value.filter((descriptor) => descriptor.cluster_id !== id)
  }

  function nextClusterOrder(level: FlavorLevel) {
    const orders = clusters.value.filter((c) => c.level === level).map((c) => c.sort_order)
    return (orders.length ? Math.max(...orders) : 0) + 10
  }

  // Descriptors --------------------------------------------------------------

  async function addDescriptor(payload: FlavorDescriptorCreatePayload) {
    const created = await createFlavorDescriptor({
      ...payload,
      name: payload.name.trim(),
      note: payload.note?.trim() || null,
      sort_order: payload.sort_order ?? nextDescriptorOrder(payload.cluster_id),
    })
    descriptors.value = [...descriptors.value, created]
    return created
  }

  async function updateDescriptor(id: string, payload: FlavorDescriptorUpdatePayload) {
    const updated = await updateFlavorDescriptor(id, {
      ...payload,
      ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
      ...(payload.note !== undefined ? { note: payload.note?.trim() || null } : {}),
    })
    descriptors.value = descriptors.value.map((descriptor) =>
      descriptor.id === updated.id ? updated : descriptor,
    )
    return updated
  }

  async function removeDescriptor(id: string) {
    await deleteFlavorDescriptor(id)
    descriptors.value = descriptors.value.filter((descriptor) => descriptor.id !== id)
  }

  function nextDescriptorOrder(clusterId: string) {
    const orders = descriptors.value
      .filter((d) => d.cluster_id === clusterId)
      .map((d) => d.sort_order)
    return (orders.length ? Math.max(...orders) : 0) + 10
  }

  return {
    clusters,
    descriptors,
    loading,
    clustersWithDescriptors,
    lexicon,
    loadAll,
    addCluster,
    updateCluster,
    removeCluster,
    addDescriptor,
    updateDescriptor,
    removeDescriptor,
  }
})
