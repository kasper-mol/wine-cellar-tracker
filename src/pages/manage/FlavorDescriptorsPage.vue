<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import FlavorClustersTable from '@/components/FlavorDescriptors/FlavorClustersTable.vue'
import EditFlavorClusterDialog from '@/components/FlavorDescriptors/EditFlavorClusterDialog.vue'
import CreateFlavorClusterDialog from '@/components/FlavorDescriptors/CreateFlavorClusterDialog.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import type { FlavorClusterWithDescriptors } from '@/types/flavorDescriptors'

const flavorDescriptorsStore = useFlavorDescriptorsStore()

const selectedClusterId = ref<string | null>(null)
const editDialogRef = ref<InstanceType<typeof EditFlavorClusterDialog> | null>(null)

onMounted(async () => {
  await flavorDescriptorsStore.loadAll()
})

function handleEditCluster(cluster: FlavorClusterWithDescriptors) {
  selectedClusterId.value = cluster.id
  editDialogRef.value?.openDialog()
}

function handleClusterRemoved() {
  selectedClusterId.value = null
}
</script>

<template>
  <div>
    <ManageHeader
      title="Flavour descriptors"
      note="The WSET Level 3 Wine-Lexicon: descriptors grouped into clusters under primary, secondary and tertiary."
    >
      <template #actions>
        <CreateFlavorClusterDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <FlavorClustersTable @editCluster="handleEditCluster" />

    <EditFlavorClusterDialog
      ref="editDialogRef"
      :cluster-id="selectedClusterId"
      @clusterRemoved="handleClusterRemoved"
    />
  </div>
</template>
