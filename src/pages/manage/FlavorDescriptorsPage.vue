<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import FlavorDescriptorGroupsTable from '@/components/FlavorDescriptors/FlavorDescriptorGroupsTable.vue'
import EditFlavorGroupDialog from '@/components/FlavorDescriptors/EditFlavorGroupDialog.vue'
import CreateFlavorGroupDialog from '@/components/FlavorDescriptors/CreateFlavorGroupDialog.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'

const flavorDescriptorsStore = useFlavorDescriptorsStore()

const selectedGroup = ref<{ level: string; category: string | null } | null>(null)
const editDialogRef = ref<InstanceType<typeof EditFlavorGroupDialog> | null>(null)

onMounted(async () => {
  await flavorDescriptorsStore.loadAll()
})

function handleEditGroup(payload: { level: string; category: string | null }) {
  selectedGroup.value = payload
  editDialogRef.value?.openDialog()
}

function handleGroupUpdated(payload: { level: string; category: string | null }) {
  selectedGroup.value = payload
}

function handleGroupCleared() {
  selectedGroup.value = null
}
</script>

<template>
  <div>
    <ManageHeader
      title="Flavour descriptors"
      note="Descriptors are grouped by level and category, as the aroma wheel arranges them."
    >
      <template #actions>
        <CreateFlavorGroupDialog />
      </template>
    </ManageHeader>

    <ManageTabs />

    <FlavorDescriptorGroupsTable @editGroup="handleEditGroup" />

    <EditFlavorGroupDialog
      ref="editDialogRef"
      :group="selectedGroup"
      @groupUpdated="handleGroupUpdated"
      @groupCleared="handleGroupCleared"
    />
  </div>
</template>
