<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useFlavorDescriptorsStore } from '@/stores/flavorDescriptors'
import FlavorDescriptorGroupsTable from '@/components/FlavorDescriptors/FlavorDescriptorGroupsTable.vue'
import EditFlavorGroupDialog from '@/components/FlavorDescriptors/EditFlavorGroupDialog.vue'
import CreateFlavorGroupDialog from '@/components/FlavorDescriptors/CreateFlavorGroupDialog.vue'

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
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-sm uppercase tracking-wide text-muted-foreground">Flavor descriptors</p>
        <h1 class="text-3xl font-semibold tracking-tight">Flavor group management</h1>
        <p class="text-muted-foreground">
          Edit flavor groups, adjust levels, and manage descriptors in each category.
        </p>
      </div>
      <div class="flex gap-2">
        <CreateFlavorGroupDialog />
      </div>
    </div>

    <FlavorDescriptorGroupsTable @editGroup="handleEditGroup" />

    <EditFlavorGroupDialog
      ref="editDialogRef"
      :group="selectedGroup"
      @groupUpdated="handleGroupUpdated"
      @groupCleared="handleGroupCleared"
    />
  </div>
</template>
