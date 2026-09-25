<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import FeedbackBanner from '@/components/FeedbackBanner.vue'
import ManageHeader from '@/components/manage/ManageHeader.vue'
import ManageTabs from '@/components/manage/ManageTabs.vue'
import { useFeedback } from '@/composables/useFeedback'
import { fetchAdminProfiles, setCanScanLabels } from '@/services/profiles'
import type { AdminProfileRow } from '@/types/profiles'

const { feedback, setSuccess, setError } = useFeedback()

const profiles = ref<AdminProfileRow[]>([])
const isLoading = ref(true)
const pendingId = ref<string | null>(null)

onMounted(load)

async function load() {
  isLoading.value = true
  try {
    profiles.value = await fetchAdminProfiles()
  } catch (error) {
    setError(error, 'Failed to load users.')
  } finally {
    isLoading.value = false
  }
}

async function toggleCanScanLabels(profile: AdminProfileRow, value: boolean) {
  pendingId.value = profile.id
  try {
    await setCanScanLabels(profile.id, value)
    profile.can_scan_labels = value
    setSuccess(`${value ? 'Enabled' : 'Disabled'} label scanning for ${profile.email}.`)
  } catch (error) {
    setError(error, 'Failed to update permission.')
  } finally {
    pendingId.value = null
  }
}
</script>

<template>
  <div>
    <ManageHeader
      title="Users"
      note="Who can use the label-scan AI feature — each scan costs API credit, so grant it deliberately."
    />

    <ManageTabs />

    <Table>
      <TableHeader>
        <TableRow class="hover:bg-transparent">
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead class="w-[90px]">Admin</TableHead>
          <TableHead class="w-[140px]">Can scan labels</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody v-if="profiles.length">
        <TableRow v-for="profile in profiles" :key="profile.id">
          <TableCell>{{ profile.email }}</TableCell>
          <TableCell class="text-foreground/70">{{ profile.display_name ?? '—' }}</TableCell>
          <TableCell>{{ profile.is_admin ? 'Yes' : '—' }}</TableCell>
          <TableCell>
            <Checkbox
              :model-value="profile.can_scan_labels"
              :disabled="pendingId === profile.id"
              @update:model-value="toggleCanScanLabels(profile, $event === true)"
            />
          </TableCell>
        </TableRow>
      </TableBody>
      <TableBody v-else-if="!isLoading">
        <TableRow class="hover:bg-transparent">
          <TableCell colspan="4" class="py-3 text-sm text-foreground/[0.55]">
            No users yet.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <FeedbackBanner :feedback="feedback" class="mt-4" />
  </div>
</template>
