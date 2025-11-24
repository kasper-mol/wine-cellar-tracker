<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWineDefinitionStore } from '@/stores/wineDefinitions'
import { useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table'

const store = useWineDefinitionStore()
const router = useRouter()

onMounted(() => {
  store.loadDefinitions()
})

function goToEdit(id: string) {
  router.push(`/manage/wine-definitions/${id}`)
}

function createNew() {
  router.push(`/manage/wine-definitions/new`)
}
</script>

<template>
  <div class="space-y-4">
    <Button @click="createNew">Create New Wine Definition</Button>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="def in store.definitions" :key="def.id">
          <TableCell>{{ def.name }}</TableCell>
          <TableCell>
            <span v-if="def.appellation_id">Appellation</span>
            <span v-else-if="def.region_id">Region</span>
            <span v-else-if="def.country_id">Country</span>
          </TableCell>
          <TableCell>{{ def.version }}</TableCell>
          <TableCell>
            <Button size="sm" @click="goToEdit(def.id)">Edit</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
